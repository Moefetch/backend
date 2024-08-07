import { v4 as uuidv4 } from "uuid";
import { INewMediaSubmittionItem, queueDictionary, IRequestStatus  } from "types";
import { RawData, WebSocketServer } from "ws";


const queue: queueDictionary = {
  requests: {},
  downloadProgressBars: {}
};

interface webSocketMessage {
  typeOfAction: string,
  id: string,
  content: any
}

export class requestsWebSocketsWrapper {
  
  /**
   * upsertRequest
   */
  public upsertRequest(id: string, requestStatus: IRequestStatus) {
    console.log(requestStatus);
    
    const requestJson = {
      typeOfAction: "update request queue",
      id,
      content: {
        numberOfEntries: requestStatus.numberOfEntries,
        currentIndex: requestStatus.currentIndex,
        status: requestStatus.status,
        error: requestStatus.error
      }  
    }
    this.sendToAllClients(requestJson);
  }
  /**
   * upsertDownloadProgress
   */
  public upsertDownloadProgress(id: string, value: number ) {
    const requestJson = {
      typeOfAction: "update download progress bars dictionary",
      id,
      content: value
    };
    this.sendToAllClients(requestJson)
  }

  private sendToAllClients(value: any){
    this.wss.clients.forEach(client => {
      client.send(JSON.stringify(value))
    })
  }

  private sendFullQueue() {
    const messageJson: webSocketMessage = {id:"", typeOfAction: "send full queue", content: queue }
    this.sendToAllClients(messageJson);
  }

  public parseIncomingWebSocketMessage(message: RawData) {
    const messageJson: webSocketMessage = JSON.parse(message.toString());
    switch (messageJson.typeOfAction) {
      case "send full queue": 
        this.sendFullQueue();
        break;
      default:
        console.log("Warning: unparsed action of type: ", messageJson.typeOfAction);
        break;
    }
    
  }
  
  public wss: WebSocketServer = new WebSocketServer({ noServer: true });
  constructor() {
    const parseIncomingWebSocketMessage = this.parseIncomingWebSocketMessage.bind(this);
    this.wss.on('connection', function (ws, request) {

      ws.on('error', console.error);
      
      ws.on('message', parseIncomingWebSocketMessage);
    
    });
  }
}

export const wssW = new requestsWebSocketsWrapper();

export class requestStatusTracker implements IRequestStatus {
  public id: string;
  public currentIndex?: number;
  public url?: string;
  public numberOfEntries?: number;
  public status: "Initializing" | "Processing" | "Downloading" | "Done";
  public thumbnail?: string;
  public error?: any; //any will be replaced with proper types (self made depending on where error occurs, e.g downloading)
  public newSubmittion: INewMediaSubmittionItem;
  private wssW = wssW;
  
  /**
   * emitNewEntry
   */
  public emitNewEntry() {
    queue.requests[this.id] = this;
    this.emitUpdatedEntry();
  }

  /**
   * emitDownloadStatus
   */
  public emitDownloadStatus(downloadProgressPrcentile: number) {
    queue.downloadProgressBars[this.id] = downloadProgressPrcentile;
    this.wssW.upsertDownloadProgress(this.id, downloadProgressPrcentile)
  }
  /**
   * getValue
   */
  public getValue() {
    return {
      id: this.id,
      status: this.status,
      currentIndex: this.currentIndex,
      numberOfEntries: this.numberOfEntries,
      newSubmittion: this.newSubmittion,
      thumbnail: this.thumbnail,
      error: this.error,
    }
  }
  /**
   * emitUpdatedEntry
   */
  public emitUpdatedEntry() {
    this.wssW.upsertRequest(this.id, this.getValue())
  }

  /**
   * deleteEntryFromQue
   */
  public deleteEntryFromQue() {
    delete queue[this.id]
  }
  
  public setStatus(status: typeof this.status) {
    this.status = status;
    this.emitUpdatedEntry();
  }
  
  constructor(entryStatus: IRequestStatus) {
    this.id = entryStatus.id;
    this.status = "Initializing";
    this.currentIndex = entryStatus.currentIndex;
    this.numberOfEntries = entryStatus.numberOfEntries;
    this.emitNewEntry();
  }
  
}


const actions: "" | "update request queue" | "update download progress bars dictionary" | "" = "";