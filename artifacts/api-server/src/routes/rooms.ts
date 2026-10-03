import {
  CreateRoomBody,
  CreateRoomResponse,
  GetRoomParams,
  GetRoomResponse,
  UpdateRoomSettingsBody,
  UpdateRoomSettingsParams,
  UpdateRoomSettingsResponse,
} from "@workspace/api-zod";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  createRoom,
  getRoomForMember,
  updateRoomSettingsAsHost,
} from "../lib/rooms";

const router: IRouter = Router();

function sendError(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

type AuthenticatedRequest = Request & { user: NonNullable<Request["user"]> };

function requireAuthenticated(
  req: Request,
  res: Response,
): req is AuthenticatedRequest {
  if (req.isAuthenticated()) return true;
  sendError(res, 401, "Authentication required.");
  return false;
}

router.post("/rooms", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;

  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "Invalid room data.");
    return;
  }

  const details = await createRoom(req.user.id, parsed.data);
  res.status(201).json(CreateRoomResponse.parse(details));
});

router.get("/rooms/:roomId", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;

  const parsed = GetRoomParams.safeParse(req.params);
  if (!parsed.success) {
    sendError(res, 400, "Invalid room ID.");
    return;
  }

  const details = await getRoomForMember(parsed.data.roomId, req.user.id);
  if (!details) {
    sendError(res, 404, "Room not found.");
    return;
  }
  res.json(GetRoomResponse.parse(details));
});

router.patch(
  "/rooms/:roomId/settings",
  async (req: Request, res: Response): Promise<void> => {
    if (!requireAuthenticated(req, res)) return;

    const params = UpdateRoomSettingsParams.safeParse(req.params);
    if (!params.success) {
      sendError(res, 400, "Invalid room ID.");
      return;
    }

    const parsed = UpdateRoomSettingsBody.safeParse(req.body);
    if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
      sendError(res, 400, "At least one valid room setting is required.");
      return;
    }

    const result = await updateRoomSettingsAsHost(
      params.data.roomId,
      req.user.id,
      parsed.data,
    );
    if (result.kind === "not_found") {
      sendError(res, 404, "Room not found.");
      return;
    }
    if (result.kind === "forbidden") {
      sendError(res, 403, "Only the room host can change settings.");
      return;
    }
    if (result.kind === "conflict") {
      sendError(res, 409, "Room settings cannot change after the room starts.");
      return;
    }

    res.json(UpdateRoomSettingsResponse.parse(result.details));
  },
);

export default router;