import fs, { ReadStream } from "fs";
import { IProcessDictionary, ICategoryDictionary, ILogicCategory, ILogicCategorySpecialParamsDictionary, ILogicModels, ILogicSpecialParamsDictionary, ILogicSpecialSettingsDictionary, IModelDictionary, IModelSpecialParam, IParam, IParamValidityCheck, IPicFormStockOverrides, ISettings, INewPicture } from "types";
import settings from "../settings";
import Utility from "./Utility";
export class Logic {
    public settings: ISettings;
    public categoryDictionary: IProcessDictionary;
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
    public async ProcessInput(input: string | Express.Multer.File, type: string, album: string, optionalOverrideParams: IModelSpecialParam, stockOptionalOverrides: IPicFormStockOverrides) {
        let categoryDictionary = this.categoryDictionary[type]
        let resultantData: INewPicture | undefined;
        let inputToProcess: string | Express.Multer.File | undefined = undefined;
        if (typeof input == "string" && ~input.search(/^https?:\/\//)) { // string mught be path
            const {hostname} = new URL(input)
            const processFunc = categoryDictionary[hostname]
            if (processFunc) {
                resultantData = await processFunc(input, album, optionalOverrideParams, stockOptionalOverrides)
            } else inputToProcess = input
        } else inputToProcess = input;
        
        if (inputToProcess) {
           if (categoryDictionary['undefined']) {
               resultantData = await categoryDictionary['undefined'](inputToProcess, album, optionalOverrideParams, stockOptionalOverrides, categoryDictionary)
           }
        }
         
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
                
            } //else if (!resultantData.thumbnailFile && !resultantData.imagesDataArray[resultantData.indexer].isVideo && !resultantData.imagesDataArray[resultantData.indexer].thumbnail_file) resultantData.thumbnailURL = resultantData.imagesDataArray[resultantData.indexer].file
            else resultantData.thumbnailURL = resultantData.imagesDataArray[resultantData.indexer].thumbnail_file
        }

        if (resultantData?.imagesDataArray.length) return resultantData

    }    

    private loadLogicModules() {
        const categoryDictionary: IProcessDictionary = {};
        const settingsDictionary: IModelSpecialParam = {}
        const paramsDictionary: IModelSpecialParam = {}
        console.log(process.env.EXTENSION ?? "js");
        
        const logicModules = fs.readdirSync('./plugins/logicModels/').filter(file => file.endsWith(process.env.EXTENSION ?? "js"))
        console.log(logicModules);
        
        logicModules.forEach(category => {
            const logicModule = require(`../plugins/logicModels/${category.substring(0, category.lastIndexOf('.'))}`);
            
            const moduleInstance: ILogicModels = new logicModule.default(this.settings, this.utility)

            moduleInstance.specialSettings ? (Object.assign(settingsDictionary, moduleInstance.specialSettings)) : {};
            moduleInstance.newEntryParams ? (Object.assign(paramsDictionary, moduleInstance.newEntryParams)) : {};
            
            moduleInstance.specialSettingValidityCheckArray ? (this.specialSettingValidityCheck = [...this.specialSettingValidityCheck, ...moduleInstance.specialSettingValidityCheckArray]) : ({})
            Object.getOwnPropertyNames(moduleInstance.processDictionary).forEach(category => {
                if (!categoryDictionary[category]) {
                    Object.assign(categoryDictionary, moduleInstance.processDictionary)
                } else {
                    Object.assign(categoryDictionary[category], moduleInstance.processDictionary[category])
                }
            
            })
            
            
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
