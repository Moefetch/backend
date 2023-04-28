import Utility from "../../../Utility";
import { ILogicCategorySpecialParamsDictionary, ILogicModel, IModelSpecialParam, INewPicture, IPicFormStockOverrides, ISettings } from "../../../../types";
import { InstagramModelUtility } from "./UtilityForModels/Instagram.ModelUtility";

const utility = new Utility();

export default class LogicModel implements ILogicModel {
    public supportedHostName: string = "www.instagram.com";
    
    public InstagramModelUtility: InstagramModelUtility;
    constructor(settings: ISettings) {
        this.InstagramModelUtility = new InstagramModelUtility(settings, utility)
        this.process = this.process.bind(this)
    }
    public async process(inputUrl: string, album: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary, stockOptionalOverrides: IPicFormStockOverrides):Promise<INewPicture> {
        return this.InstagramModelUtility.processInstagramPost(inputUrl, album, optionalOverrideParams, stockOptionalOverrides)
    }
    
    public specialNewEntryParam: IModelSpecialParam = {}; 
    public specialSettingsParam: IModelSpecialParam = {};  

}
