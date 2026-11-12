import { GetExpansionCardArtParams } from "@workspace/api-zod";
import { Router, type IRouter, type Request, type Response } from "express";
import { assetArtStorage } from "../lib/assetArtStorage";

const router: IRouter = Router();

router.get(
  "/card-art/:cardId",
  async (req: Request, res: Response): Promise<void> => {
    const parsed = GetExpansionCardArtParams.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid card artwork request." });
      return;
    }

    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (!bucketId) {
      res.status(503).json({ error: "Card artwork storage is unavailable." });
      return;
    }

    const { cardId } = parsed.data;
    const file = assetArtStorage.bucket(bucketId).file(`redline-card-expansion/${cardId}.webp`);

    try {
      const [exists] = await file.exists();
      if (!exists) {
        res.status(404).json({ error: "Card artwork was not found." });
        return;
      }

      const [metadata] = await file.getMetadata();
      res.status(200);
      res.setHeader("Content-Type", "image/webp");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      if (metadata.size) res.setHeader("Content-Length", String(metadata.size));

      file.createReadStream()
        .on("error", (error: Error) => {
          req.log.error({ errorName: error.name, cardId }, "Card artwork stream failed");
          if (res.headersSent) res.destroy(error);
          else res.status(503).end();
        })
        .pipe(res);
    } catch (error) {
      req.log.error(
        { errorName: error instanceof Error ? error.name : "Error", cardId },
        "Card artwork storage request failed",
      );
      if (!res.headersSent) res.status(503).json({ error: "Card artwork is temporarily unavailable." });
      else res.destroy(error instanceof Error ? error : undefined);
    }
  },
);

export default router;
