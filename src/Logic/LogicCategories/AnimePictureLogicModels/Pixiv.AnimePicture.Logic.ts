import Utility from "../../../Utility";
import { ILogicModel, INewAnimePic, ISettings } from "../../../../types";
import { PixivModelUtility } from "./UtilityForModels/Pixiv.ModelUtility";

const utility = new Utility();

export default class LogicModel implements ILogicModel {
    public supportedHostName: string = "www.pixiv.net";
    private settings: ISettings
    public pixivModelUtility: PixivModelUtility;
    constructor(settings: ISettings) {
        this.settings = settings;
        this.pixivModelUtility = new PixivModelUtility(this.settings, utility)
        this.process = this.process.bind(this)
        
    }
    
    public async process(url: string):Promise<INewAnimePic> {
        const pixivPostId = url.substring(
            url.lastIndexOf(
                url.includes('illust_id=') ? '=' : '/'
            ) + 1);
            
            console.log(this);
            
            const res = (await this.pixivModelUtility.processPixivId(pixivPostId)) ?? { data: {}, indexer: 0, imagesDataArray: []};
        return res
    }
}

