import fs from "fs";
import { ICategoryDictionary, ILogicCategory, ILogicCategorySpecialParamsDictionary, ILogicSpecialParamsDictionary, ILogicSpecialSettingsDictionary, IModelDictionary, IParam, IParamValidityCheck, IPicFormStockOverrides, ISettings } from "types";
import settings from "../../settings";
export class Logic {
    public settings: ISettings;
    public categoryDictionary: ICategoryDictionary;
    public specialSettingsDictionary?: ILogicSpecialSettingsDictionary
    public specialParamsDictionary?: ILogicSpecialParamsDictionary;
    public specialSettingValidityCheck: IParamValidityCheck[] = [];
    public supportedTypes: string[];

    constructor(settings: ISettings) {
        
        this.settings = settings;
        this.categoryDictionary = this.loadCategoryClasses();
        this.supportedTypes = Object.getOwnPropertyNames(this.categoryDictionary)

    }

    /**
     * ProcessInput
     */
    public ProcessInput(input: string | File, type:string, album: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary, stockOptionalOverrides: IPicFormStockOverrides) {
        const ass = this.categoryDictionary

        return ass[type](input, album, optionalOverrideParams, stockOptionalOverrides)
    }    

    private loadCategoryClasses() {
        const categoryDictionary:ICategoryDictionary = {};
        const settingsDictionary: ILogicSpecialSettingsDictionary = {}
        const paramsDictionary: ILogicSpecialParamsDictionary = {}

        const logicCategories = fs.readdirSync('./src/Logic/LogicCategories/').filter(file => file.endsWith('.ts'))
        
        logicCategories.forEach(category => {
            const Category = require(`./LogicCategories/${category.substring(0, category.lastIndexOf('.'))}`);
            const categoryInstence:ILogicCategory = new Category.CategoryLogic(this.settings)
            
            categoryInstence.specialSettingsDictionary ? (settingsDictionary[categoryInstence.logicCategory] = categoryInstence.specialSettingsDictionary) : {};
            categoryInstence.specialParamsDictionary ? (paramsDictionary[categoryInstence.logicCategory] = categoryInstence.specialParamsDictionary) : {};
            categoryInstence.specialSettingValidityCheck ? (this.specialSettingValidityCheck = [...this.specialSettingValidityCheck, ...categoryInstence.specialSettingValidityCheck]) : ({})
            categoryDictionary[categoryInstence.logicCategory] = categoryInstence.ProcessInput;
        })
        this.specialParamsDictionary = paramsDictionary;
        this.specialSettingsDictionary = settingsDictionary;

        return categoryDictionary
    }

    
/**
 * checkSauceNaoAPI
 */
static checkSauceNaoApi(input: string) {
    return true;
  }
  
}