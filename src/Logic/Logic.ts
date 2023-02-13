import fs from "fs";
import { ICategoryDictionary, ILogicCategory, IModelDictionary, ISettings } from "types";
import settings from "../../settings";
export class Logic {
    public settings: ISettings;
    public categoryDictionary: ICategoryDictionary;
    public supportedTypes: string[];
    constructor(settings: ISettings) {
        
        this.settings = settings;
        this.categoryDictionary = this.loadCategoryClasses();
        this.supportedTypes = Object.getOwnPropertyNames(this.categoryDictionary)
        console.log(this.supportedTypes);
    }

    /**
     * ProcessInput
     */
    public ProcessInput(input: string | File, type:string, album: string) {
        const ass = this.categoryDictionary
        console.log(ass, type);
        console.log(this.supportedTypes);


        return ass[type](input, album)
    }    

    private loadCategoryClasses() {
        const categoryDictionary:ICategoryDictionary = {};
        const logicCategories = fs.readdirSync('./src/Logic/LogicCategories/').filter(file => file.endsWith('.ts'))
        
        logicCategories.forEach(category => {
            const Category = require(`./LogicCategories/${category.substring(0, category.lastIndexOf('.'))}`);
            const categoryInstence:ILogicCategory = new Category.CategoryLogic(this.settings)
            categoryDictionary[categoryInstence.logicCategory] = categoryInstence.ProcessInput;
        })

        return categoryDictionary
    }

    
/**
 * checkSauceNaoAPI
 */
static checkSauceNaoApi(input: string) {
    return true;
  }
  
}