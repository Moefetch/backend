import Utility from "../../../Utility";
import { ILogicModel, INewPicture, ISettings } from "../../../../types";
import { LineStickersModelUtility } from "./UtilityForModels/Line.ModelUtility";

const utility = new Utility();

export default class LogicModel implements ILogicModel {
    public supportedHostName: string = "store.line.me";
    
    public lineStickersModelUtility: LineStickersModelUtility;
    constructor(settings: ISettings) {
        this.lineStickersModelUtility = new LineStickersModelUtility(settings, utility)
        this.process = this.process.bind(this)
    }

    public async process(inputUrl: string):Promise<INewPicture> {
        return this.lineStickersModelUtility.processLineStickerPage(inputUrl);
    }
}
