import { MosaicBoard, type MosaicBoardEnv } from "./MosaicBoard";

export { MosaicBoard };

export type Env = MosaicBoardEnv;

const BOARD_NAME = "main";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = env.MOSAIC_BOARD.idFromName(BOARD_NAME);
    const stub = env.MOSAIC_BOARD.get(id);
    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;
