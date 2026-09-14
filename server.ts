import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";

/**
 * Función principal para iniciar el servidor de la app web
 * Este servidor actúa como proxy entre la app web y la API de SLiMS en el NAS Synology
 */
async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json());

  // ─── Redirección HTTP → HTTPS ──────────────────────────────────
  // Fuerza HTTPS en producción excepto para conexiones locales
  if (process.env.NODE_ENV === "production") {
    app.use((req, res, next) => {
      if (!req.secure && req.headers["x-forwarded-proto"] !== "https") {
        return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
      }
      next();
    });
  }

  // ─── Cabeceras de seguridad ────────────────────────────────────
  app.use((req, res, next) => {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    next();
  });

  // ─── Sin caché ─────────────────────────────────────────────────
  // La app es un SPA servido desde el NAS: no se cachea nada para que
  // los cambios en el NAS se vean al recargar la pagina.
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });

  // URL base de la API de SLiMS — configurable mediante variable de entorno
  const SLIMS_API_BASE =
    process.env.SLIMS_API_BASE || "http://localhost/slims/api/index.php";

  console.log(`[server] SLiMS API base: ${SLIMS_API_BASE}`);

  /**
   * Verificar si una socia existe en SLiMS
   * POST /api/verify-member
   * Cuerpo: { member_id: string }
   */
  app.post("/api/verify-member", async (req, res) => {
    const { member_id } = req.body;

    if (!member_id) {
      return res.status(400).json({
        status: "error",
        message: "El ID de la socia es obligatorio.",
      });
    }

    try {
      console.log(`[verify-member] Consultando socia: ${member_id}`);
      const response = await axios.get(
        `${SLIMS_API_BASE}?_api_path=/member/${encodeURIComponent(member_id)}/verify`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "Barrioteca-App/1.0",
          },
          timeout: 8000,
        }
      );

      console.log(`[verify-member] Respuesta SLiMS (${response.status}):`, JSON.stringify(response.data).substring(0, 200));

      // Transformar la respuesta para que el frontend reciba siempre { status, data, message }
      if (response.data.status === "success" && response.data.data) {
        return res.json({
          status: "success",
          message: `Socia verificada: ${response.data.data.member_name || member_id}`,
          data: {
            member_id: response.data.data.member_id || member_id,
            member_name: response.data.data.member_name || `Socia ${member_id}`,
            ...response.data.data,
          },
        });
      }

      return res.json(response.data);
    } catch (error: any) {
      console.error("[verify-member] Error:", error.message);
      console.error("[verify-member] SLiMS status:", error.response?.status);
      console.error("[verify-member] SLiMS data:", error.response?.data);

      return res.status(error.response?.status || 500).json({
        status: "error",
        message:
          error.response?.data?.message || "Error al verificar a la socia.",
      });
    }
  });

  /**
   * Consultar disponibilidad de un libro
   * GET /api/item-status?isbn=XXXXXXXX
   */
  app.get("/api/item-status", async (req, res) => {
    const { isbn } = req.query;

    if (!isbn) {
      return res.status(400).json({
        status: "error",
        message: "El ISBN/ASIN es obligatorio.",
      });
    }

    try {
      const response = await axios.get(
        `${SLIMS_API_BASE}?_api_path=/item/${encodeURIComponent(isbn as string)}/status`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "Barrioteca-App/1.0",
          },
          timeout: 8000,
        }
      );

      return res.json(response.data);
    } catch (error: any) {
      console.error("[item-status] Error:", error.message);

      return res.status(error.response?.status || 500).json({
        status: "error",
        message:
          error.response?.data?.message ||
          "Error al consultar disponibilidad del libro.",
      });
    }
  });

  /**
   * Registrar una operación (Préstamo o Devolución)
   * POST /api/perform-action
   * Cuerpo: { accion: "prestamo" | "devolucion", member_id: string, code: string }
   */
  app.post("/api/perform-action", async (req, res) => {
    const { accion, code, member_id } = req.body;

    if (!accion) {
      return res.status(400).json({
        status: "error",
        message: "Faltan parámetros requeridos: 'accion'",
      });
    }

    const lowerAccion = accion.toLowerCase();
    const finalMemberId = (member_id || "").trim();
    const finalItemCode = (code || "").trim();

    console.log(`[perform-action] Acción: ${lowerAccion}, member: ${finalMemberId}, item: ${finalItemCode}`);

    try {
      // Acción: Verificar socia (redirigido desde perform-action)
      if (
        ["verificar_socia", "verificar_socio", "login", "verificar"].includes(
          lowerAccion
        )
      ) {
        if (!finalMemberId) {
          return res.status(400).json({
            status: "error",
            message: "El ID de la socia es obligatorio.",
          });
        }

        const response = await axios.get(
          `${SLIMS_API_BASE}?_api_path=/member/${encodeURIComponent(finalMemberId)}/verify`,
          {
            headers: {
              Accept: "application/json",
              "User-Agent": "Barrioteca-App/1.0",
            },
            timeout: 8000,
          }
        );

        if (response.data.status === "success" && response.data.data) {
          return res.json({
            status: "success",
            message: `Acceso concedido a ${response.data.data.member_name}.`,
            data: {
              member_id: finalMemberId,
              member_name: response.data.data.member_name,
              ...response.data.data,
            },
          });
        }

        return res.json(response.data);
      }

      // Acción: Préstamo
      else if (["prestamo", "loan"].includes(lowerAccion)) {
        if (!finalMemberId || !finalItemCode) {
          return res.status(400).json({
            status: "error",
            message:
              "Faltan datos para el préstamo (ID de socia y código de libro).",
          });
        }

        // Enviar como POST a SLiMS con los parámetros en el body
        const response = await axios.post(
          `${SLIMS_API_BASE}?_api_path=/loan/borrow`,
          {
            member_id: finalMemberId,
            item_code: finalItemCode,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              "User-Agent": "Barrioteca-App/1.0",
            },
            timeout: 8000,
          }
        );

        console.log(`[perform-action] Préstamo OK:`, JSON.stringify(response.data).substring(0, 200));
        return res.json(response.data);
      }

      // Acción: Devolución
      else if (["devolucion", "return"].includes(lowerAccion)) {
        if (!finalItemCode) {
          return res.status(400).json({
            status: "error",
            message: "Falta el código del libro para la devolución.",
          });
        }

        const response = await axios.post(
          `${SLIMS_API_BASE}?_api_path=/loan/return`,
          {
            item_code: finalItemCode,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              "User-Agent": "Barrioteca-App/1.0",
            },
            timeout: 8000,
          }
        );

        console.log(`[perform-action] Devolución OK:`, JSON.stringify(response.data).substring(0, 200));
        return res.json(response.data);
      }

      // Acción no reconocida
      else {
        return res.status(400).json({
          status: "error",
          message: `Acción desconocida: ${accion}`,
        });
      }
    } catch (error: any) {
      console.error("[perform-action] Error:", error.message);
      console.error("[perform-action] SLiMS status:", error.response?.status);
      console.error("[perform-action] SLiMS data:", error.response?.data);

      if (error.response?.data) {
        return res
          .status(error.response.status || 500)
          .json(error.response.data);
      }

      return res.status(500).json({
        status: "error",
        message: `Error al conectar con SLiMS: ${error.message}`,
      });
    }
  });

  /**
   * Proxy para obtener metadatos de un libro (Google Books + OpenLibrary + Covers)
   * GET /api/book-metadata?isbn=XXXXXXXX
   */
  app.get("/api/book-metadata", async (req, res) => {
    const { isbn } = req.query;

    if (!isbn) {
      return res
        .status(400)
        .json({ status: "error", message: "ISBN requerido" });
    }

    const cleanIsbn = (isbn as string).replace(/[-\s]/g, "").trim();
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY || "";

    let result: any = null;

    // 1) Google Books
    try {
      let url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(cleanIsbn)}`;
      if (apiKey) url += `&key=${apiKey}`;

      const gb = await axios.get(url, { timeout: 5000 });

      if (gb.data?.items?.length > 0) {
        const info = gb.data.items[0].volumeInfo;
        result = {
          title: info.title || null,
          authors: info.authors ? info.authors.join(", ") : null,
          image: info.imageLinks?.thumbnail || null,
          description: info.description || null,
          provider: "google",
        };
      }
    } catch (error: any) {
      console.warn("[book-metadata] Google Books falló:", error.message);
    }

    // 2) OpenLibrary (respaldo gratuito, sin clave)
    if (!result) {
      try {
        const olUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(
          cleanIsbn
        )}&format=json&jscmd=data`;
        const ol = await axios.get(olUrl, { timeout: 8000 });

        const key = `ISBN:${cleanIsbn}`;
        const book = ol.data?.[key];
        if (book) {
          const authors = Array.isArray(book.authors)
            ? book.authors.map((a: any) => a.name).filter(Boolean).join(", ")
            : null;
          result = {
            title: book.title || null,
            authors,
            image: book.cover?.large || book.cover?.medium || null,
            description: null,
            provider: "openlibrary",
          };
        }
      } catch (error: any) {
        console.warn("[book-metadata] OpenLibrary falló:", error.message);
      }
    }

    // 3) OpenLibrary Covers (solo portada, por ISBN)
    if (result && !result.image) {
      try {
        const coverUrl = `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(
          cleanIsbn
        )}-M.jpg`;
        const head = await axios.head(coverUrl, { timeout: 5000 });
        const len = Number(head.headers["content-length"] || 0);
        // Una portada real pesa varios KB; sin portada devuelve un GIF 1x1 (~43 bytes)
        if (len > 5000) {
          result.image = coverUrl;
          result.provider = "covers_openlibrary";
        }
      } catch (error: any) {
        console.warn("[book-metadata] OpenLibrary Covers falló:", error.message);
      }
    }

    return res.json({ status: "success", data: result });
  });

  /**
   * Proxy para búsqueda en el catálogo
   * GET /api/catalog-proxy?q=...
   */
  app.get("/api/catalog-proxy", async (req, res) => {
    const { q } = req.query;

    if (!q) {
      return res.json([]);
    }

    try {
      const response = await axios.get(
        `${SLIMS_API_BASE}?_api_path=/biblio/search&q=${encodeURIComponent(q as string)}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "Barrioteca-App/1.0",
          },
          timeout: 8000,
        }
      );

      if (Array.isArray(response.data)) {
        const results = response.data.map((item: any) => ({
          id: item.biblio_id,
          title: item.title,
          author: item.author || "Autora Desconocida",
          isbn: item.isbn_issn,
          status: item.is_available ? "disponible" : "prestada",
          image: item.image,
        }));
        return res.json(results);
      }

      return res.json([]);
    } catch (error: any) {
      console.error("[catalog-proxy] Error:", error.message);
      return res.json([]);
    }
  });

  // Compatibilidad con api-proxy.php: el frontend llama con ?action=...
  // (dev usa VITE_API_ENDPOINT=/api, o ./api-proxy.php si no hay .env).
  async function dispatchAction(req: any, res: any) {
    const params: any = { ...(req.query || {}), ...(req.body || {}) };
    const action = String(params.action || "");
    const headers = { Accept: "application/json", "User-Agent": "Barrioteca-App/1.0" };

    const verify = async (memberId: string) => {
      const r = await axios.get(
        `${SLIMS_API_BASE}?_api_path=/member/${encodeURIComponent(memberId)}/verify`,
        { headers, timeout: 8000 }
      );
      if (r.data?.status === "success" && r.data?.data) {
        return {
          status: "success",
          message: `Socia verificada: ${r.data.data.member_name || memberId}`,
          data: {
            member_id: memberId,
            member_name: r.data.data.member_name || `Socia ${memberId}`,
            ...r.data.data,
          },
        };
      }
      return r.data;
    };

    switch (action) {
      case "verify-member": {
        const id = String(params.member_id || "").trim();
        if (!id) {
          return res.status(400).json({ status: "error", message: "El ID de la socia es obligatorio." });
        }
        try {
          return res.json(await verify(id));
        } catch (e: any) {
          return res.status(e.response?.status || 500).json({
            status: "error",
            message: e.response?.data?.message || "Error al verificar a la socia.",
          });
        }
      }

      case "member-loans": {
        const id = String(params.member_id || "").trim();
        if (!id) {
          return res.status(400).json({ status: "error", message: "El ID de la socia es obligatorio." });
        }
        try {
          const r = await axios.get(
            `${SLIMS_API_BASE}?_api_path=/member/${encodeURIComponent(id)}/loans`,
            { headers, timeout: 8000 }
          );
          return res.json({ status: "success", data: r.data?.data || [] });
        } catch (e: any) {
          console.error("[member-loans]", e.message);
          return res.json({ status: "success", data: [] });
        }
      }

      case "catalog-list": {
        try {
          const r = await axios.get(
            `${SLIMS_API_BASE}?_api_path=/biblio/search&q=_&_limit=999`,
            { headers, timeout: 8000 }
          );
          if (Array.isArray(r.data)) {
            return res.json(
              r.data.map((it: any) => ({
                id: it.biblio_id ?? "",
                title: it.title ?? "",
                author: it.author || "Autora Desconocida",
                isbn: it.isbn_issn ?? "",
                status: it.is_available ? "disponible" : "prestada",
                image: it.image ?? "",
                notes: it.notes ?? "",
                item_code: it.item_code ?? "",
              }))
            );
          }
          return res.json([]);
        } catch (e: any) {
          console.error("[catalog-list]", e.message);
          return res.json([]);
        }
      }

      case "perform-action": {
        const accion = String(params.accion || "").toLowerCase();
        const code = String(params.code || params.asin || params.isbn || "").trim();
        const memberId = String(params.member_id || "").trim();
        try {
          if (["verificar_socia", "verificar_socio", "login", "verificar"].includes(accion)) {
            if (!memberId) {
              return res.status(400).json({ status: "error", message: "El ID de la socia es obligatorio." });
            }
            return res.json(await verify(memberId));
          }
          if (["prestamo", "loan"].includes(accion)) {
            if (!memberId || !code) {
              return res.status(400).json({
                status: "error",
                message: "Faltan datos para el préstamo (ID de socia y código de libro).",
              });
            }
            const r = await axios.post(
              `${SLIMS_API_BASE}?_api_path=/loan/borrow`,
              { member_id: memberId, item_code: code },
              { headers: { ...headers, "Content-Type": "application/json" }, timeout: 8000 }
            );
            return res.json(r.data);
          }
          if (["devolucion", "return"].includes(accion)) {
            if (!code) {
              return res.status(400).json({ status: "error", message: "Falta el código del libro para la devolución." });
            }
            const r = await axios.post(
              `${SLIMS_API_BASE}?_api_path=/loan/return`,
              { item_code: code },
              { headers: { ...headers, "Content-Type": "application/json" }, timeout: 8000 }
            );
            return res.json(r.data);
          }
          return res.status(400).json({ status: "error", message: `Acción desconocida: ${accion}` });
        } catch (e: any) {
          return res
            .status(e.response?.status || 500)
            .json(
              e.response?.data || {
                status: "error",
                message: `Error al conectar con SLiMS: ${e.message}`,
              }
            );
        }
      }

      default:
        return res.status(400).json({ status: "error", message: `Acción no soportada: ${action}` });
    }
  }

  app.all("/api", dispatchAction);
  app.all("/api-proxy.php", dispatchAction);

  // Configuración de Vite para desarrollo
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Servir archivos estáticos en producción
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[server] app web ejecutándose en http://localhost:${PORT}`);
    console.log(`[server] SLiMS API: ${SLIMS_API_BASE}`);
    console.log(`[server] Modo: ${process.env.NODE_ENV || "development"}`);
  });
}

startServer();