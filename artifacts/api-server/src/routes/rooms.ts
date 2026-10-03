import {
  CreateRoomBody,
  CreateRoomResponse,
  GetRoomMatchParams,
  GetRoomMatchResponse,
  GetRoomParams,
  GetRoomResponse,
  JoinRoomBody,
  JoinRoomResponse,
  LeaveRoomParams,
  LeaveRoomResponse,
  SetRoomReadyBody,
  SetRoomReadyParams,
  SetRoomReadyResponse,
  SetRoomSelectionBody,
  SetRoomSelectionParams,
  SetRoomSelectionResponse,
  StartRoomParams,
  StartRoomResponse,
  SubmitMatchActionBody,
  SubmitMatchActionParams,
  SubmitMatchActionResponse,
  UpdateRoomSettingsBody,
  UpdateRoomSettingsParams,
  UpdateRoomSettingsResponse,
} from "@workspace/api-zod";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  createRoom,
  getRoomForMember,
  joinRoomByCode,
  leaveRoom,
  setReady,
  setSelection,
  startRoomAsHost,
  updateRoomSettingsAsHost,
  type RoomResult,
} from "../lib/rooms";
import { getMatchForMember, submitMatchAction, type MatchResult } from "../lib/match";

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

function send(
  res: Response,
  result: RoomResult,
  parse: (value: unknown) => unknown,
  okStatus = 200,
  notFoundMessage = "Room not found.",
): void {
  switch (result.kind) {
    case "ok":
      res.status(okStatus).json(parse(result.details));
      return;
    case "not_found":
      sendError(res, 404, notFoundMessage);
      return;
    case "forbidden":
      sendError(res, 403, result.message);
      return;
    case "conflict":
      sendError(res, 409, result.message);
      return;
    case "invalid":
      sendError(res, 400, result.message);
      return;
  }
}

function sendMatch(
  res: Response,
  result: MatchResult,
  parse: (value: unknown) => unknown,
): void {
  if (result.kind === "ok") {
    res.status(200).json(parse(result.snapshot));
    return;
  }
  const status = { not_found: 404, forbidden: 403, conflict: 409, invalid: 400 }[result.kind];
  sendError(res, status, result.kind === "not_found" ? "Match not found." : result.message);
}

router.post("/rooms", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;

  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "Invalid room data.");
    return;
  }

  send(res, await createRoom(req.user.id, parsed.data), (v) => CreateRoomResponse.parse(v), 201);
});

router.post("/rooms/join", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;

  const parsed = JoinRoomBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "Enter a valid room code.");
    return;
  }

  send(
    res,
    await joinRoomByCode(req.user.id, parsed.data.code),
    (v) => JoinRoomResponse.parse(v),
    200,
    "No room found with that code.",
  );
});

router.get("/rooms/:roomId", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;

  const parsed = GetRoomParams.safeParse(req.params);
  if (!parsed.success) {
    sendError(res, 400, "Invalid room ID.");
    return;
  }

  send(res, await getRoomForMember(parsed.data.roomId, req.user.id), (v) => GetRoomResponse.parse(v));
});

router.post("/rooms/:roomId/leave", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;

  const parsed = LeaveRoomParams.safeParse(req.params);
  if (!parsed.success) {
    sendError(res, 400, "Invalid room ID.");
    return;
  }

  send(res, await leaveRoom(parsed.data.roomId, req.user.id), (v) => LeaveRoomResponse.parse(v));
});

router.post("/rooms/:roomId/ready", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;

  const params = SetRoomReadyParams.safeParse(req.params);
  const body = SetRoomReadyBody.safeParse(req.body);
  if (!params.success || !body.success) {
    sendError(res, 400, "Invalid ready request.");
    return;
  }

  send(
    res,
    await setReady(params.data.roomId, req.user.id, body.data.ready),
    (v) => SetRoomReadyResponse.parse(v),
  );
});

router.post("/rooms/:roomId/selection", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;

  const params = SetRoomSelectionParams.safeParse(req.params);
  const body = SetRoomSelectionBody.safeParse(req.body);
  if (!params.success || !body.success || Object.keys(body.data).length === 0) {
    sendError(res, 400, "Invalid selection.");
    return;
  }

  send(
    res,
    await setSelection(params.data.roomId, req.user.id, body.data),
    (v) => SetRoomSelectionResponse.parse(v),
  );
});

router.get("/rooms/:roomId/match", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;

  const parsed = GetRoomMatchParams.safeParse(req.params);
  if (!parsed.success) {
    sendError(res, 400, "Invalid room ID.");
    return;
  }

  sendMatch(res, await getMatchForMember(parsed.data.roomId, req.user.id), (v) => GetRoomMatchResponse.parse(v));
});

router.post("/rooms/:roomId/match/actions", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;

  const params = SubmitMatchActionParams.safeParse(req.params);
  const body = SubmitMatchActionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    sendError(res, 400, "Invalid action request.");
    return;
  }

  sendMatch(
    res,
    await submitMatchAction(params.data.roomId, req.user.id, body.data.action, body.data.expectedVersion),
    (v) => SubmitMatchActionResponse.parse(v),
  );
});

router.post("/rooms/:roomId/start", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;

  const parsed = StartRoomParams.safeParse(req.params);
  if (!parsed.success) {
    sendError(res, 400, "Invalid room ID.");
    return;
  }

  send(res, await startRoomAsHost(parsed.data.roomId, req.user.id), (v) => StartRoomResponse.parse(v));
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

    send(
      res,
      await updateRoomSettingsAsHost(params.data.roomId, req.user.id, parsed.data),
      (v) => UpdateRoomSettingsResponse.parse(v),
    );
  },
);

export default router;
