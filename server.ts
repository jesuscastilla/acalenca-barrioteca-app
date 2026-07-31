import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";

/**
 * Función principal para iniciar el servidor de la PWA
 * Este servidor actúa como proxy entre la PWA y la API de SLiMS en el NAS Synology
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
            "User-Agent": "Barrioteca-PWA/1.0",
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
            "User-Agent": "Barrioteca-PWA/1.0",
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
              "User-Agent": "Barrioteca-PWA/1.0",
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
              "User-Agent": "Barrioteca-PWA/1.0",
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
              "User-Agent": "Barrioteca-PWA/1.0",
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
   * Proxy para obtener metadatos de un libro desde Google Books
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

    try {
      let url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(cleanIsbn)}`;
      if (apiKey) url += `&key=${apiKey}`;

      const response = await axios.get(url, { timeout: 5000 });

      if (response.data?.items?.length > 0) {
        const info = response.data.items[0].volumeInfo;
        return res.json({
          status: "success",
          data: {
            title: info.title || null,
            authors: info.authors ? info.authors.join(", ") : null,
            image: info.imageLinks?.thumbnail || null,
          },
        });
      }

      return res.json({ status: "success", data: null });
    } catch (error: any) {
      console.error("[book-metadata] Error:", error.message);
      return res.status(500).json({
        status: "error",
        message: "No se pudieron obtener los metadatos.",
      });
    }
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
            "User-Agent": "Barrioteca-PWA/1.0",
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
    console.log(`[server] PWA ejecutándose en http://localhost:${PORT}`);
    console.log(`[server] SLiMS API: ${SLIMS_API_BASE}`);
    console.log(`[server] Modo: ${process.env.NODE_ENV || "development"}`);
  });
}

startServer();