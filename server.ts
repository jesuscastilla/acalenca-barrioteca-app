import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Base URL de la API de SLiMS
  const SLIMS_API_BASE = process.env.SLIMS_API_BASE || "https://pelotxo.synology.me/slims/api/v1";

  /**
   * Verificar si un socio existe en SLiMS
   * POST /api/verify-member
   * Body: { member_id: string }
   */
  app.post("/api/verify-member", async (req, res) => {
    const { member_id } = req.body;

    if (!member_id) {
      return res.status(400).json({ 
        status: "error", 
        message: "El ID de la socia es obligatorio." 
      });
    }

    try {
      const response = await axios.get(
        `${SLIMS_API_BASE}/member/${encodeURIComponent(member_id)}/verify`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "Barrioteca-PWA/1.0"
          },
          timeout: 8000
        }
      );

      // Pasar la respuesta de SLiMS directamente
      return res.json(response.data);
    } catch (error: any) {
      console.error("Error verifying member:", error.message);
      
      // En caso de error, devolver un error claro
      return res.status(error.response?.status || 500).json({
        status: "error",
        message: error.response?.data?.message || "Error al verificar a la socia."
      });
    }
  });

  /**
   * Consultar disponibilidad de un libro
   * GET /api/item-status
   * Query: { isbn: string }
   */
  app.get("/api/item-status", async (req, res) => {
    const { isbn } = req.query;

    if (!isbn) {
      return res.status(400).json({
        status: "error",
        message: "El ISBN/ASIN es obligatorio."
      });
    }

    try {
      const response = await axios.get(
        `${SLIMS_API_BASE}/item/${encodeURIComponent(isbn as string)}/status`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "Barrioteca-PWA/1.0"
          },
          timeout: 8000
        }
      );

      return res.json(response.data);
    } catch (error: any) {
      console.error("Error checking item status:", error.message);
      
      return res.status(error.response?.status || 500).json({
        status: "error",
        message: error.response?.data?.message || "Error al consultar disponibilidad del libro."
      });
    }
  });

  /**
   * Registrar un préstamo
   * POST /api/perform-action
   * Body: { accion: "prestamo", member_id: string, item_code: string }
   * 
   * Este endpoint mantiene compatibilidad con la interfaz anterior de la PWA
   * pero ahora usa la nueva API de SLiMS
   */
  app.post("/api/perform-action", async (req, res) => {
    const {
      accion,
      code,
      id_socia,
      id_socio,
      member_id,
      member_code,
      asin,
      isbn
    } = req.body;

    if (!accion) {
      return res.status(400).json({
        status: "error",
        message: "Faltan parámetros requeridos: 'accion'"
      });
    }

    const lowerAccion = accion.toLowerCase();
    const finalMemberId = (id_socia || id_socio || member_id || member_code || "").trim();
    const finalItemCode = (asin || code || isbn || "").trim();

    try {
      // Acción: Verificar socio
      if (["verificar_socia", "verificar_socio", "login", "verificar"].includes(lowerAccion)) {
        if (!finalMemberId) {
          return res.status(400).json({
            status: "error",
            message: "El ID del socio es obligatorio."
          });
        }

        const response = await axios.get(
          `${SLIMS_API_BASE}/member/${encodeURIComponent(finalMemberId)}/verify`,
          {
            headers: {
              "Accept": "application/json",
              "User-Agent": "Barrioteca-PWA/1.0"
            },
            timeout: 8000
          }
        );

        // Transformar la respuesta para compatibilidad con la PWA
        if (response.data.status === "success" && response.data.data) {
          return res.json({
            status: "success",
            nombre: response.data.data.member_name,
            message: `Acceso concedido a ${response.data.data.member_name}.`
          });
        }

        return res.json(response.data);
      }

      // Acción: Préstamo
      else if (["prestamo", "loan"].includes(lowerAccion)) {
        if (!finalMemberId || !finalItemCode) {
          return res.status(400).json({
            status: "error",
            message: "Faltan datos para el préstamo (member_id e item_code)."
          });
        }

        const response = await axios.post(
          `${SLIMS_API_BASE}/loan/borrow`,
          {
            member_id: finalMemberId,
            item_code: finalItemCode
          },
          {
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "User-Agent": "Barrioteca-PWA/1.0"
            },
            timeout: 8000
          }
        );

        return res.json(response.data);
      }

      // Acción: Devolución
      else if (["devolucion", "return"].includes(lowerAccion)) {
        if (!finalItemCode) {
          return res.status(400).json({
            status: "error",
            message: "Falta el código del libro para la devolución."
          });
        }

        const response = await axios.post(
          `${SLIMS_API_BASE}/loan/return`,
          {
            item_code: finalItemCode
          },
          {
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "User-Agent": "Barrioteca-PWA/1.0"
            },
            timeout: 8000
          }
        );

        return res.json(response.data);
      }

      // Acción desconocida
      else {
        return res.status(400).json({
          status: "error",
          message: `Acción desconocida: ${accion}`
        });
      }
    } catch (error: any) {
      console.error("Error performing action:", error.message);

      // Devolver el error de SLiMS si está disponible
      if (error.response?.data) {
        return res.status(error.response.status || 500).json(error.response.data);
      }

      // Error genérico de conexión
      return res.status(500).json({
        status: "error",
        message: `Error al conectar con SLiMS: ${error.message}`
      });
    }
  });

  /**
   * Proxy para búsqueda de catálogo
   * GET /api/catalog-proxy
   * Query: { q: string }
   * 
   * Nota: Este endpoint es un placeholder. La búsqueda de catálogo
   * requeriría un endpoint adicional en la API de SLiMS.
   */
  app.get("/api/catalog-proxy", async (req, res) => {
    const { q } = req.query;

    if (!q) {
      return res.json([]);
    }

    try {
      const response = await axios.get(`${SLIMS_API_BASE}/biblio/search?q=${encodeURIComponent(q as string)}`, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Barrioteca-PWA/1.0"
        },
        timeout: 8000
      });
      
      // Mapear los resultados al formato que espera el componente CatalogSearch.tsx
      const results = response.data.map((item: any) => ({
        id: item.biblio_id,
        title: item.title,
        author: item.author || "Autor Desconocido",
        isbn: item.isbn_issn,
        status: item.is_available ? "disponible" : "prestado",
        image: item.image
      }));

      return res.json(results);
    } catch (error: any) {
      console.error("Error searching catalog:", error.message);
      return res.json([]);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`SLiMS API Base: ${SLIMS_API_BASE}`);
  });
}

startServer();
