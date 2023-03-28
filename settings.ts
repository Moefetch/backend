import * as fs from 'fs' 
import { IParam, ILogicSpecialSettingsDictionary, ILogicCategorySpecialSettingsDictionary, ILogicSpecialParamsDictionary } from "types";

type IStockSettings = {
    blur_nsfw: IParam;
    show_hidden: IParam;
    show_nsfw: IParam;
    thumbnail_list_to_left: IParam;
};


export interface ISetting {
    port: number;
    ip: string;
    downloadFolder: string;
    initialSetup: boolean;
    hostname: string;
    database_url: IParam;
    stock_settings: IStockSettings;
    special_settings: ILogicSpecialSettingsDictionary;
    special_params: ILogicSpecialParamsDictionary;
}

/**
 * Creates a settings JSON and loads it from the same folder the executable is in
 * stolen from Taku by Geoxor 
 */
class Settings implements ISetting {
    public port: number;
    public ip: string;
    public downloadFolder: string;
    public initialSetup: boolean;
    public hostname: string ;
    public database_url: IParam;
    public stock_settings: IStockSettings;
    public special_settings: ILogicSpecialSettingsDictionary;
    public special_params: ILogicSpecialParamsDictionary;

    constructor(){
        !fs.existsSync("./settings.json") && this.save()
        const { port, 
            ip, 
            hostname, 
            database_url, 
            initialSetup,
            downloadFolder,
            stock_settings,
            special_settings,
            special_params } = JSON.parse(
            fs.readFileSync("./settings.json", { encoding: "utf-8" })
        ) as ISetting;
        this.ip = !!ip ? ip : "";
        this.initialSetup = initialSetup ?? false;
        this.port = port ?? 2234;
        this.database_url = database_url ?? {
          containsString: true,
            checkBoxValue: false,
            checkBoxDescription: "Use a mongoDB database",
            stringValue: {
              stringPlaceholder:
                "Database URL, use the form mongodb://username:password@host:port/moefetch",
              value: "",
            }
          },
        this.downloadFolder = downloadFolder ?? '../files'
        this.hostname = hostname ?? "http://127.0.0.1:2234";
        this.special_settings = special_settings ?? {};
        this.special_params = special_params ?? {};
        this.stock_settings = stock_settings ?? {
            blur_nsfw: {
              containsString: false,
              checkBoxValue: true,
              checkBoxDescription: "Blur NSFW tagged posts",
            },
            show_hidden: {
              containsString: false,
              checkBoxValue: true,
              checkBoxDescription: "Show hidden posts and albums",
            },
            show_nsfw: {
              containsString: false,
              checkBoxValue: true,
              checkBoxDescription: "Show NSFW tagged posts",
            },
            thumbnail_list_to_left: {
              containsString: false,
              checkBoxValue: false,
              checkBoxDescription: "Have the list of thumbnails on the left or on the bottom",
            }
          }

        this.save();
        
        return this;
    }
    /**
     * save 
     */
    public save() {
        fs.writeFileSync("./settings.json", JSON.stringify(this, null, 2));
        
    }

}

export default new Settings();
/* 
export function checkMongoDbURLValid (enabledBool: boolean, stringValue?: string) {
  if (enabledBool && !stringValue) return "No Database url was provided";

  const HOSTS_REGEX =
    /(?<protocol>mongodb(?:\+srv|)):\/\/(?:(?<username>[^:]*)(?::(?<password>[^@]*))?@)?(?<hosts>(?!:)[^\/?@]+)(?<rest>.*)/;

  if (enabledBool && stringValue && !HOSTS_REGEX.test(stringValue))
    return "Database url invalid";
} */