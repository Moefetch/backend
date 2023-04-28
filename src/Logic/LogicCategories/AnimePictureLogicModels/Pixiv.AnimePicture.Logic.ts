import Utility from "../../../Utility";
import { ILogicModel, INewAnimePic, ISettings, IModelSpecialParam, ILogicCategorySpecialParamsDictionary, IPicFormStockOverrides } from "../../../../types";
import { PixivModelUtility } from "./UtilityForModels/Pixiv.ModelUtility";

const utility = new Utility();

export default class LogicModel implements ILogicModel {
    public supportedHostName: string = "www.pixiv.net";
    private settings: ISettings
    public specialSettingsParam:IModelSpecialParam;
    public pixivModelUtility: PixivModelUtility;
    constructor(settings: ISettings) {
        this.settings = settings;
        this.pixivModelUtility = new PixivModelUtility(this.settings, utility)
        this.process = this.process.bind(this)
        this.specialSettingsParam = this.pixivModelUtility.specialSettingsParam
    }
    
    public async process(url: string, album: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary, stockOptionalOverrides: IPicFormStockOverrides):Promise<INewAnimePic> {
        const pixivPostId = url.substring(
            url.lastIndexOf(
                url.includes('illust_id=') ? '=' : '/'
            ) + 1);
          const dlFirstOnly = (optionalOverrideParams && optionalOverrideParams.specialHostnameSpecificParams) ? optionalOverrideParams.specialHostnameSpecificParams["www.pixiv.net"]["pixiv_download_first_image_only"].checkBoxValue : this.specialNewEntryParam['pixiv_download_first_image_only'].checkBoxValue
                        
            const res = (await this.pixivModelUtility.processPixivId(pixivPostId, dlFirstOnly)) ?? { data: {}, indexer: 0, imagesDataArray: []};
        return res
    }

    public specialNewEntryParam:IModelSpecialParam = {
        "pixiv_download_first_image_only" : {
      containsString: false,
      checkBoxValue: false,
            checkBoxDescription: "Download first image only in pixiv post in case of multiple images",
        }
    };
    
    
}

