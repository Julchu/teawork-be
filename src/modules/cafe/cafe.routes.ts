import { type Response, type Router, Router as createRouter } from "express";
import type { AuthRequest } from "../../types";
import {
  deleteCafe,
  getCafe,
  listCafes,
  listFavoriteCafes,
  saveCafe,
  setCafeFavorite,
  updateCafe,
} from "./cafe.service.ts";
import {
  invalidCafeMessage,
  listCafesQuerySchema,
  publicIdSchema,
  saveCafeBodySchema,
  toCafeInput,
  updateCafeBodySchema,
} from "./cafe.validation.ts";

export const cafeRouter: Router = createRouter();

const publicIdFrom = (value: string | undefined) => {
  const parsed = publicIdSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

cafeRouter.get("/", async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: "Invalid user ID" });
    return;
  }

  const parsed = listCafesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Invalid cafe query" });
    return;
  }

  const near =
    parsed.data.lat !== undefined && parsed.data.lng !== undefined
      ? {
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          radiusMeters: parsed.data.radiusMeters ?? 5_000,
        }
      : undefined;

  try {
    const cafes = await listCafes(req.userId, {
      near,
      submitted: parsed.data.submitted,
    });
    res.json({ success: true, data: cafes });
  } catch (error) {
    console.error("Failed to list cafes", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

cafeRouter.get("/favorites", async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: "Invalid user ID" });
    return;
  }

  try {
    const cafes = await listFavoriteCafes(req.userId);
    res.json({ success: true, data: cafes });
  } catch (error) {
    console.error("Failed to list favorite cafes", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

cafeRouter.get("/:publicId", async (req: AuthRequest<{ publicId: string }>, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: "Invalid user ID" });
    return;
  }

  const publicId = publicIdFrom(req.params.publicId);
  if (!publicId) {
    res.status(404).json({ success: false, error: "Cafe not found" });
    return;
  }

  try {
    const cafe = await getCafe(req.userId, publicId);
    if (!cafe) {
      res.status(404).json({ success: false, error: "Cafe not found" });
      return;
    }

    res.json({ success: true, data: cafe });
  } catch (error) {
    console.error("Failed to get cafe", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

cafeRouter.post("/", async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: "Invalid user ID" });
    return;
  }

  const parsed = saveCafeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: invalidCafeMessage(parsed.error) });
    return;
  }

  const { publicId, ...cafeBody } = parsed.data;

  try {
    const saved = await saveCafe(req.userId, toCafeInput(cafeBody), publicId);
    if (saved.status === "not_found") {
      res.status(404).json({ success: false, error: "Cafe not found" });
      return;
    }

    const cafe = await getCafe(req.userId, saved.publicId);
    res.status(saved.created ? 201 : 200).json({ success: true, data: cafe });
  } catch (error) {
    console.error("Failed to create cafe", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

cafeRouter.patch("/:publicId", async (req: AuthRequest<{ publicId: string }>, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: "Invalid user ID" });
    return;
  }

  const publicId = publicIdFrom(req.params.publicId);
  if (!publicId) {
    res.status(404).json({ success: false, error: "Cafe not found" });
    return;
  }

  const parsed = updateCafeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: invalidCafeMessage(parsed.error) });
    return;
  }

  try {
    const cafe = await updateCafe(req.userId, publicId, parsed.data);
    if (!cafe) {
      res.status(404).json({ success: false, error: "Cafe not found" });
      return;
    }

    res.json({ success: true, data: cafe });
  } catch (error) {
    console.error("Failed to update cafe", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

cafeRouter.delete("/:publicId", async (req: AuthRequest<{ publicId: string }>, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: "Invalid user ID" });
    return;
  }

  const publicId = publicIdFrom(req.params.publicId);
  if (!publicId) {
    res.status(404).json({ success: false, error: "Cafe not found" });
    return;
  }

  try {
    const deleted = await deleteCafe(req.userId, publicId);
    if (deleted === "not_found") {
      res.status(404).json({ success: false, error: "Cafe not found" });
      return;
    }
    if (deleted === "forbidden") {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }

    res.json({ success: true, data: null });
  } catch (error) {
    console.error("Failed to delete cafe", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

cafeRouter.post(
  "/:publicId/favorite",
  async (req: AuthRequest<{ publicId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ success: false, error: "Invalid user ID" });
      return;
    }

    const publicId = publicIdFrom(req.params.publicId);
    if (!publicId) {
      res.status(404).json({ success: false, error: "Cafe not found" });
      return;
    }

    try {
      const cafe = await setCafeFavorite(req.userId, publicId, true);
      if (!cafe) {
        res.status(404).json({ success: false, error: "Cafe not found" });
        return;
      }

      res.json({ success: true, data: cafe });
    } catch (error) {
      console.error("Failed to favorite cafe", error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  },
);

cafeRouter.delete(
  "/:publicId/favorite",
  async (req: AuthRequest<{ publicId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ success: false, error: "Invalid user ID" });
      return;
    }

    const publicId = publicIdFrom(req.params.publicId);
    if (!publicId) {
      res.status(404).json({ success: false, error: "Cafe not found" });
      return;
    }

    try {
      const cafe = await setCafeFavorite(req.userId, publicId, false);
      if (!cafe) {
        res.status(404).json({ success: false, error: "Cafe not found" });
        return;
      }

      res.json({ success: true, data: cafe });
    } catch (error) {
      console.error("Failed to unfavorite cafe", error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  },
);