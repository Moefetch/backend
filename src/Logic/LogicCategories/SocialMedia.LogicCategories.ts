import fs from 'fs'
import { ILogicModel, IModelDictionary, ISettings, ILogicCategory, ILogicModelConstructor, INewPicture, ILogicCategorySpecialSettingsDictionary, ILogicCategorySpecialParamsDictionary, IPicFormStockOverrides } from 'types';
import Utility from '../../Utility';

export class CategoryLogic implements ILogicCategory {
  public specialSettingsDictionary?: ILogicCategorySpecialSettingsDictionary;
  public specialParamsDictionary?: ILogicCategorySpecialParamsDictionary;
  public categoryFolder = 'SocialMediaLogicModels'
  public logicCategory: string = "Social Media"
  public processDictionary:IModelDictionary;
  private utility: Utility;

  public settings: ISettings;
  constructor(settings: ISettings, utility: Utility) {
      this.settings = settings;
      this.utility = utility;

      const loadedModels = this.utility.loadModels(settings, this.categoryFolder);
      this.processDictionary = loadedModels.processDictionary;
      this.specialSettingsDictionary = loadedModels.specialSettingsDictionary;
      this.specialParamsDictionary = loadedModels.specialParamsDictionary;

      this.ProcessInput = this.ProcessInput.bind(this);
      this.processUrl = this.processUrl.bind(this)
  }

  /**
   * ProcessInput
   */
  public async ProcessInput(input: string | File, album: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary, stockOptionalOverrides: IPicFormStockOverrides) {
      let resultantData: INewPicture|undefined = {
          data: {},
          indexer: 0,
          isNSFW: false,
          imagesDataArray: []
        };
        if (typeof input == "string"){
          resultantData = await this.processUrl(input, album, optionalOverrideParams, stockOptionalOverrides);
        }
        else {
          resultantData = {data: {}, indexer: 0, imagesDataArray: []} //no reverese image searvh for social media no?
        }
      return resultantData;
  }

  private async processUrl(url: string, album: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary, stockOptionalOverrides: IPicFormStockOverrides)  {
    const link = new URL(url);
    const processPromise = this.processDictionary[link.hostname]
    
    return processPromise ? processPromise(url, album, optionalOverrideParams, stockOptionalOverrides) : undefined;
  }

}


