import express, { Express } from "express";
import cors from "cors";
import http from "http";
import settings from "./settings";
import chalk from "chalk";
import Utility from './src/Utility'
import {Router} from "./src/routes";

const utility = new Utility();

utility.checkDirectoryAndCreate(`${settings.downloadFolder}/temp_downloads/`)

if (!utility.checkDirectoryAndCreate(`${settings.downloadFolder}/album_thumbnail_files/`)) {
  utility.saveBlankThumbnail(`${settings.downloadFolder}/album_thumbnail_files/`)
  /* utility.downloadFromUrl(
    "https://raw.githubusercontent.com/Moefetch/backend/33a32fb43464e006eb84c43202b8350d68136e75/image.svg",
    settings.downloadFolder,
    `/album_thumbnail_files/`,{providedFileName: 'image'}
  ); */
}
class backendServer {
  public express: Express;
  public server: http.Server;
  private backendURL = process.env.DEV
    ? "http://127.0.0.1:2234"
    : "http://localhost:2234"; //if you wanna go with a hostname

  constructor() {
    this.express = express();
    this.server = http.createServer(this.express);
    console.log('Backend URL: ', this.backendURL);

    this.registerExpressRoutes();

    this.server.listen(settings.port, () =>
      console.log(
        chalk.cyan(`[SERVER] Started on port ${settings.port.toString()}`)
      )
    );
  }
  private async registerExpressRoutes() {
    this.express.use(
      cors({
        origin: (origin: any, callback: any) => callback(null, true),
      })
    );
    //oh fuck here we go
    this.express.use(express.json());
    this.express.use(express.static(settings.downloadFolder));
    this.express.use(await Router)
  }
}
export default new backendServer();
