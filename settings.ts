import * as fs from 'fs' 
import { IParam, ILogicSpecialSettingsDictionary, ILogicCategorySpecialSettingsDictionary, ILogicSpecialParamsDictionary, IModelSpecialParam } from "types";

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
    hostname: string;
    database: ITypeORMDatabase;
    stock_settings: IStockSettings;
    special_settings: IModelSpecialParam;
    special_params: IModelSpecialParam;
}

export interface ITypeORMDatabase {
  type: "sqlite" | "mysql" | "postgres" |"cockroachdb" | "sap" | "spanner" | "mariadb" | "better-sqlite3" ;
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?:string;
}

/**
 * Creates a settings JSON and loads it from the same folder the executable is in
 */
class Settings implements ISetting {
    public port: number;
    public ip: string;
    public downloadFolder: string;
    public hostname: string ;
    public database: ITypeORMDatabase;
    public stock_settings: IStockSettings;
    public special_settings: IModelSpecialParam;
    public special_params: IModelSpecialParam;

    constructor(){
        !fs.existsSync(process.env.baseDir || '.' + "/settings.json") && this.save()
        const { port, 
            ip, 
            hostname,
            database,
            downloadFolder,
            stock_settings,
            special_settings,
            special_params } = JSON.parse(
            fs.readFileSync(process.env.baseDir || '.' + "/settings.json", { encoding: "utf-8" })
        ) as ISetting;
        this.ip = !!ip ? ip : "";
        this.port = port ?? 2234;
        this.database = database ?? {
          type: "better-sqlite3",
          database: "database.sqlite"
        };
        this.downloadFolder = downloadFolder ?? '../files'
        this.hostname = hostname ?? "http://127.0.0.1:2234";
        this.special_settings = special_settings ?? {};
        this.special_params = special_params ?? {};
        this.stock_settings = stock_settings ?? {
            blur_nsfw: {
              type: "setting",
              valueType:'checkBox',
              checkBox: {
                defaultValue: true,
                checkBoxValue: true,
                checkBoxDescription: "Blur NSFW tagged posts",
              }
            },
            show_hidden: {
              type: "setting",
              valueType:'checkBox',
              checkBox: {
                checkBoxDescription: "Show hidden posts and albums",
                checkBoxValue: true,
                defaultValue:true,
              },
            },
            show_nsfw: {
              type: "setting",
              valueType:'checkBox',
              checkBox: {
                checkBoxDescription: "Show NSFW tagged posts",
                checkBoxValue: true,
                defaultValue:true,
              },
            },
            thumbnail_list_to_left: {
              type: "setting",
              valueType:'checkBox',
              checkBox: {
                checkBoxDescription: "Have the list of thumbnails on the left or on the bottom",
                checkBoxValue: false,
                defaultValue: false,
              },
            }
          }

        this.save();
        
        return this;
    }
    /**
     * save 
     */
    public save() {
        fs.writeFileSync(process.env.baseDir || '.' + "/settings.json", JSON.stringify(this, null, 2));
        
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