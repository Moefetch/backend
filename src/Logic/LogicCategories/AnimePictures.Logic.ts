import fs from 'fs'
import SauceNao from "./AnimePictureLogicModels/UtilityForModels/Saucenao.Utilty";

import { ILogicCategorySpecialParamsDictionary, ILogicCategorySpecialSettingsDictionary, ILogicModel, IModelDictionary, ISettings, ILogicCategory, ILogicModelConstructor, IFilteredSaucenaoResult, INewAnimePic, IModelSpecialParam, IParamValidityCheck, IPicFormStockOverrides } from 'types';
import Utility from '../../Utility';

export class CategoryLogic implements ILogicCategory {
    public logicCategory: string = "Anime Picture"
    public processDictionary:IModelDictionary;
    public specialSettingValidityCheck: IParamValidityCheck[];
    public specialSettingsDictionary: ILogicCategorySpecialSettingsDictionary | undefined;
    public specialParamsDictionary?: ILogicCategorySpecialParamsDictionary = {specialCategoryParams: {}, specialHostnameSpecificParams: {}};
    private sauceNAO?: SauceNao
    private utility = new Utility()
    public settings: ISettings;
    constructor(settings: ISettings) {
      this.settings = settings;
      this.specialSettingsDictionary = {specialCategorySettings: {}, specialHostnameSpecificSettings: {}};
      this.specialSettingsDictionary.specialCategorySettings = {};
       
      const loadedModels= this.loadModels(settings);
      this.processDictionary = loadedModels.processDictionary;
      this.specialSettingsDictionary = loadedModels.specialSettingsDictionary;
      this.specialParamsDictionary = loadedModels.specialParamsDictionary;
      this.specialSettingValidityCheck = [...loadedModels.specialSettingValidityCheckArray, ...SauceNao.specialSettingsParamValidityCheck];

      if (
          settings.special_settings["Anime Picture"].specialCategorySettings 
          && settings.special_settings["Anime Picture"].specialCategorySettings.saucenao_api_key.checkBoxValue 
          && settings.special_settings["Anime Picture"].specialCategorySettings.saucenao_api_key.stringValue?.value
        ) 
        this.sauceNAO = new SauceNao(settings.special_settings["Anime Picture"].specialCategorySettings.saucenao_api_key.stringValue.value);
      if (this.specialSettingsDictionary.specialCategorySettings) {
        Object.assign(this.specialSettingsDictionary.specialCategorySettings, SauceNao.specialSettingsParam)
      } else this.specialSettingsDictionary.specialCategorySettings = SauceNao.specialSettingsParam

      this.processUrl = this.processUrl.bind(this) 
      this.ProcessInput = this.ProcessInput.bind(this);
    }

    /**
     * ProcessInput
     */
    public async ProcessInput(input: string | File, album: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary, stockOptionalOverrides: IPicFormStockOverrides) {
        let resultantData: INewAnimePic | undefined = {
            data: {},
            indexer: 0,
            isNSFW: false,
            imagesDataArray: []
          };
          
          if (typeof input == "string"){
            resultantData = (await this.processUrl(input, optionalOverrideParams, stockOptionalOverrides)) as INewAnimePic | undefined;
            if (resultantData && resultantData.urlsArray?.length) {
              const res = await this.utility.downloadAndGetFilePaths(resultantData, album, this.settings.downloadFolder)
              if ( res ) resultantData.imagesDataArray = res
              if (resultantData.thumbnailFile) {
                resultantData.thumbnailFile = await this.utility.downloadFromUrl(resultantData.thumbnailFile, this.settings.downloadFolder, `/saved_pictures_thumbnails/${album}`,{providedFileName: `thumbnailFile - ${resultantData.storedResult ?? ''} - ${resultantData.storedResult && resultantData.ids && resultantData.ids[resultantData.storedResult]}`})
              } else resultantData.thumbnailFile = resultantData.imagesDataArray[resultantData.indexer].thumbnail_file
            }
          }
          else {
            resultantData = (await this.getImageDataFromRandomUrl(input, optionalOverrideParams, stockOptionalOverrides)) ?? {data: {}, indexer: 0, imagesDataArray: []}
          }
        return resultantData;
    }

    private async processUrl(inputUrl: string, optionalOverrideParams: ILogicCategorySpecialParamsDictionary, stockOptionalOverrides: IPicFormStockOverrides)  {
        const link = new URL(inputUrl);
        const processPromise = this.processDictionary[link.hostname] || this.getImageDataFromRandomUrl
        
        if (inputUrl.match(/[\?]*.(jpg|jpeg|gif|png|tiff|bmp)(\?(.*))?$/))
          if ((await this.utility.checkImageUrlValid(inputUrl))) 
          {
            if (this.sauceNAO) {
              const sauceParseRes = await this.getImageDataFromRandomUrl(inputUrl, optionalOverrideParams, stockOptionalOverrides)
              const imageDimensions = await this.utility.getImageResolution(inputUrl);
              return sauceParseRes || {
                data: {},
                isNSFW: false,
                indexer: 0,
                imagesDataArray: [],
                foundUrl: inputUrl,
                urlsArray: [{
                  imageUrl: inputUrl,
                  thumbnailUrl: inputUrl,
                  height: imageDimensions?.imageSize?.height || 0,
                  width: imageDimensions?.imageSize?.width || 0
                }],
                links: {other: [inputUrl]}
              } as INewAnimePic;
            }
          }

        
        return processPromise(inputUrl, optionalOverrideParams)

    }

    private loadModels(settings: ISettings) {
      let specialSettingValidityCheckArray: IParamValidityCheck[] = [];
      let specialSettingsDictionary = {specialCategorySettings: {}, specialHostnameSpecificSettings: {}};
      let specialParamsDictionary: Required<ILogicCategorySpecialParamsDictionary> = {specialCategoryParams: {}, specialHostnameSpecificParams: {}};
      specialParamsDictionary.specialHostnameSpecificParams = {}
        const animePicModels = fs.readdirSync('./src/Logic/LogicCategories/AnimePictureLogicModels/').filter(file => file.endsWith('.ts'))
        const processDictionary:IModelDictionary = {};
        /* 
        const ass:IModelDictionary = animePicModels.map(model=>{
            const Model:ILogicModelConstructor = require(`./AnimePictureLogicModels/${model.substring(0, model.lastIndexOf('.'))}`);
            const modelInstence:ILogicModel = new Model.default(settings)
            return {[modelInstence.supportedHostName]: modelInstence.process}
        }) */
        animePicModels.forEach(model => {
          const Model:ILogicModelConstructor = require(`./AnimePictureLogicModels/${model.substring(0, model.lastIndexOf('.'))}`);
          const modelInstence:ILogicModel = new Model.default(settings)
          processDictionary[modelInstence.supportedHostName] = modelInstence.process;
          modelInstence.specialNewEntryParam 
          ? (specialParamsDictionary.specialHostnameSpecificParams[modelInstence.supportedHostName] = modelInstence.specialNewEntryParam) 
          : ({})
          ;

          modelInstence.specialSettingsParam 
          ? (Object.assign(specialSettingsDictionary.specialCategorySettings, modelInstence.specialSettingsParam)) 
          : ({})
          ;
          modelInstence.specialSettingValidityCheckArray 
          ? (specialSettingValidityCheckArray = [...specialSettingValidityCheckArray, ...modelInstence.specialSettingValidityCheckArray])
          : ({})
        })

        const returnSpecialSettingsDictionary: ILogicCategorySpecialSettingsDictionary = {
        }; 
        
        Object.getOwnPropertyNames(specialSettingsDictionary.specialCategorySettings).length ? returnSpecialSettingsDictionary.specialCategorySettings = specialSettingsDictionary.specialCategorySettings : undefined;
        Object.getOwnPropertyNames(specialSettingsDictionary.specialHostnameSpecificSettings).length ? returnSpecialSettingsDictionary.specialHostnameSpecificSettings = specialSettingsDictionary.specialHostnameSpecificSettings : undefined;

        const returnSpecialParamsDictionary: ILogicCategorySpecialParamsDictionary = {
        }

        Object.getOwnPropertyNames(specialParamsDictionary.specialCategoryParams).length ? returnSpecialParamsDictionary.specialCategoryParams = specialParamsDictionary.specialCategoryParams : undefined
        Object.getOwnPropertyNames(specialParamsDictionary.specialHostnameSpecificParams).length ? returnSpecialParamsDictionary.specialHostnameSpecificParams = specialParamsDictionary.specialHostnameSpecificParams : undefined

        return {
          processDictionary: processDictionary, 
          specialSettingsDictionary: returnSpecialSettingsDictionary, 
          specialParamsDictionary: returnSpecialParamsDictionary,
          specialSettingValidityCheckArray: specialSettingValidityCheckArray,
        };
      }
    

    
  /**
   * returns a new animepic object 
   * @param url url of picture or path string
   * 
   */

  public async getImageDataFromRandomUrl(url: string | File, optionalOverrideParams: ILogicCategorySpecialParamsDictionary, stockOptionalOverrides: IPicFormStockOverrides) {

    if (this.sauceNAO) {
      const { resultArray } = await this.sauceNAO.getSauce(url);
      if (resultArray) {
        
      
      let filteredResults: IFilteredSaucenaoResult = {};

      let tagsCollective: Set<string> = new Set<string>();

      let originalPostResult: IFilteredSaucenaoResult = {};
      let originalPostAlternative: IFilteredSaucenaoResult = {};


      for (let index = 0; index < resultArray.length; index++) {
        const item = resultArray[index]  
        if (Number.parseInt(item.header.similarity) > 80 && item.data.ext_urls) {
          const urlsToParse = item.data.ext_urls.filter(a => a.includes('pixiv') || a.includes('danbooru') || a.includes('yande'))
          let animePicPerExtURL: INewAnimePic[] = [];
          let bestPic: INewAnimePic | undefined;

          for (let urlsindex = 0; urlsindex < urlsToParse.length; urlsindex++) {
            const element = urlsToParse[urlsindex];
            let animePic = (await this.processUrl(element, optionalOverrideParams, stockOptionalOverrides)) as INewAnimePic | undefined;
            
            if (animePic) {
            
            if(animePic.storedResult) { //ik this seems stupid, because it is , blame ts compiler and checker not me, it doesn't realize the type of the right side and left side will be the same since it will use same indexer and so i have to seperate the indexing that collides
              if (animePic.tags)
                animePic.tags.forEach(tagsCollective.add, tagsCollective)
              
            }
            if (animePic.urlsArray && !animePic.imageSize ) {
              await this.utility.getImageResolution(animePic.urlsArray[animePic.indexer].imageUrl).then(a => {
                if (animePic && a) {
                  animePic.imageSize = a.imageSize;                
                }
              })
            }
            if (bestPic && bestPic.imageSize && bestPic.imageSize.height && bestPic.imageSize.width) {
              bestPic = ((bestPic.imageSize.height * bestPic.imageSize.width) < ((animePic.imageSize?.height || 0) * (animePic.imageSize?.width || 0))) ? animePic : bestPic;
            } else bestPic = animePic;
        }
          }

          //console.log(index + " : ", animePicPerExtURL)
          
          
          if (item.data.material) { 
            originalPostResult = {
              reqItem: item,
              animePic: bestPic,
              imageSize: bestPic ? bestPic.imageSize : undefined,
            }
          }
      
          else if (item.data.material == "") originalPostAlternative = {
            reqItem: item,
            animePic: bestPic,
            imageSize: bestPic ? bestPic.imageSize : undefined
          }
          
          
          else if (filteredResults.animePic?.urlsArray?.length && bestPic?.urlsArray?.length && bestPic.imageSize && bestPic.imageSize.height && bestPic.imageSize.width && filteredResults.animePic.imageSize?.height && filteredResults.animePic.imageSize?.width ) {
            filteredResults =
            (bestPic?.imageSize?.height * bestPic?.imageSize?.width) > (filteredResults.animePic.imageSize.height * filteredResults.animePic.imageSize?.width)?
            {
              reqItem: item,
              animePic: bestPic,
              imageSize: bestPic ? bestPic.imageSize : undefined
            } : filteredResults
          }
          else {
            filteredResults.animePic = bestPic
          }
        }
        
      }
      const tagsCollectiveString = Array.from(tagsCollective)
      if (originalPostResult.animePic?.urlsArray?.length) {
        originalPostResult.animePic.tags = tagsCollectiveString;
        return originalPostResult.animePic
      }
      else if (originalPostAlternative.animePic?.urlsArray?.length) {
        originalPostAlternative.animePic.tags = tagsCollectiveString;
        return originalPostAlternative.animePic
      }
      else if (filteredResults.animePic?.urlsArray?.length) {
        filteredResults.animePic.tags = tagsCollectiveString;
        return filteredResults.animePic
      }
    }
  }
}


}
