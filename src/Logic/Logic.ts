import fs from "fs";
import { ICategoryDictionary, ILogicCategory, ILogicCategorySpecialParamsDictionary, ILogicModels, ILogicSpecialParamsDictionary, ILogicSpecialSettingsDictionary, IModelDictionary, IModelSpecialParam, IParam, IParamValidityCheck, IPicFormStockOverrides, ISettings } from "types";
import settings from "../../settings";
import Utility from "../Utility";
export class Logic {
    public settings: ISettings;
    public categoryDictionary: ICategoryDictionary;
    public specialSettingsDictionary?: IModelSpecialParam
    public specialParamsDictionary?: IModelSpecialParam;
    public specialSettingValidityCheck: IParamValidityCheck[] = [];
    public supportedTypes: string[];
    public utility: Utility;
    constructor(settings: ISettings) {
        this.utility = new Utility();
        this.settings = settings;
        this.categoryDictionary = this.loadLogicModules();
        this.supportedTypes = Object.getOwnPropertyNames(this.categoryDictionary);
        

    }

    /**
     * ProcessInput
     */
    public async ProcessInput(input: string | File, type:string, album: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary, stockOptionalOverrides: IPicFormStockOverrides) {
        let resultantData = await this.categoryDictionary[type](input, album, optionalOverrideParams, stockOptionalOverrides)

        if (resultantData && resultantData.urlsArray?.length) {

            if (!resultantData.imagesDataArray.length) {  
                const res = await this.utility.downloadAndGetFilePaths(resultantData, album, this.settings.downloadFolder, {providedFileNames: stockOptionalOverrides.useProvidedFileName.textField?.value.split('\n')})
                if ( res ) resultantData.imagesDataArray = res
            }
            if (resultantData.imagesDataArray.length == 1) {
                resultantData.thumbnailFile = resultantData.imagesDataArray[0].thumbnail_file;
            } else if (!resultantData.thumbnailFile && resultantData.thumbnailURL) {//same here
                resultantData.thumbnailFile = await this.utility.downloadFromUrl(
                    resultantData.thumbnailURL, 
                    this.settings.downloadFolder, 
                    `/saved_pictures_thumbnails/${album}`,
                {
                    providedFileName: `thumbnailFile_${resultantData.storedResult ?? ''}_${resultantData.storedResult && resultantData.ids && resultantData.ids[resultantData.storedResult]}`,
                    providedHeaders: resultantData.requestOptions?.providedHeaders
                }
                )
                
            } else resultantData.thumbnailURL = resultantData.imagesDataArray[resultantData.indexer].thumbnail_file

            return resultantData;
        }

    }    

    private loadLogicModules() {
        const categoryDictionary:ICategoryDictionary = {};
        const settingsDictionary: IModelSpecialParam = {}
        const paramsDictionary: IModelSpecialParam = {}

        const logicModules = fs.readdirSync('./plugins/logicModels/').filter(file => file.endsWith(process.env.EXTENSION ?? "js"))
        
        logicModules.forEach(category => {
            const logicModule = require(`../../plugins/logicModels/${category.substring(0, category.lastIndexOf('.'))}`);
            const moduleInstance: ILogicModels = new logicModule.default(this.settings, this.utility)
            
            moduleInstance.specialSettings ? (Object.assign(settingsDictionary, moduleInstance.specialSettings)) : {};
            moduleInstance.newEntryParams ? (Object.assign(paramsDictionary, moduleInstance.newEntryParams)) : {};
            moduleInstance.specialSettingValidityCheckArray ? (this.specialSettingValidityCheck = [...this.specialSettingValidityCheck, ...moduleInstance.specialSettingValidityCheckArray]) : ({})
            Object.assign(categoryDictionary,moduleInstance.processDictionary)
        })
        this.specialParamsDictionary = paramsDictionary;
        this.specialSettingsDictionary = settingsDictionary;

        return categoryDictionary
    }

    private loadCategoryClasses() {
        const categoryDictionary:ICategoryDictionary = {};
        const settingsDictionary: IModelSpecialParam = {}
        const paramsDictionary: IModelSpecialParam = {}

        const logicCategories = fs.readdirSync('./src/Logic/LogicCategories/').filter(file => file.endsWith(process.env.EXTENSION ?? "js"))
        
        logicCategories.forEach(category => {
            const Category = require(`./LogicCategories/${category.substring(0, category.lastIndexOf('.'))}`);
            const categoryInstence:ILogicCategory = new Category.CategoryLogic(this.settings, this.utility)
            
            categoryInstence.specialSettingsDictionary ? (Object.assign(settingsDictionary, categoryInstence.specialSettingsDictionary)) : {};
            categoryInstence.specialParamsDictionary ? (Object.assign(paramsDictionary, categoryInstence.specialParamsDictionary)) : {};
            categoryInstence.specialSettingValidityCheck ? (this.specialSettingValidityCheck = [...this.specialSettingValidityCheck, ...categoryInstence.specialSettingValidityCheck]) : ({})
            categoryDictionary[categoryInstence.logicCategory] = categoryInstence.ProcessInput;
        })
        this.specialParamsDictionary = paramsDictionary;
        this.specialSettingsDictionary = settingsDictionary;

        return categoryDictionary
    }

}