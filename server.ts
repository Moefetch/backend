import express, { Express } from "express";
import cors from "cors";
import http from "http";
import settings from "./settings";
console.log(settings);
import chalk from "chalk";

class backendServer {
  public express: Express;
  public server: http.Server;
  private backendURL = process.env.DEV ? "http://127.0.0.1:2234" : "http://localhost:2234" ;

  constructor() {
    this.express = express();
    this.server = http.createServer(this.express);
    console.log(this.backendURL)

    this.registerExpressRoutes();

    this.server.listen(settings.port, () =>
      console.log(chalk.cyan(`[SERVER] Started on port ${settings.port.toString()}`))
    );
  }
  private registerExpressRoutes(){
    this.express.use(
        cors({
          origin: (origin: any, callback: any) => callback(null, true),
        })
      );
    this.express.post('/force-save', async (req, res) =>{
        console.log(req);
        return res.status(200).json({"sex":"sex"})

    })
    this.express.post('/check-status', async (req, res) =>{

      return res.status(200).json({"sex":"sex"})

  })
}

}
export default new backendServer();
