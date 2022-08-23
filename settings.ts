import fs from "fs";

export interface ISetting {
    port: number;
    ip: string;
    downloadFolder: string;
    initialSetup: boolean;
    hostname: string;
    database_url: string;
    saucenao_api_key: string;
    search_diff_sites: boolean;
    pixiv_download_first_image_only: boolean;
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
    public database_url: string;
    public saucenao_api_key: string;
    public search_diff_sites: boolean;
    public pixiv_download_first_image_only: boolean;


    constructor(){
        !fs.existsSync("./settings.json") && this.save()
        const { port, 
            ip, 
            hostname, 
            database_url, 
            saucenao_api_key, 
            initialSetup, 
            search_diff_sites, 
            pixiv_download_first_image_only, 
            downloadFolder } = JSON.parse(
            fs.readFileSync("./settings.json", { encoding: "utf-8" })
        ) as ISetting;
        this.ip = !!ip ? ip : "";
        this.initialSetup = initialSetup ?? false;
        this.port = port ?? 2234;
        this.database_url = database_url ?? "mongodb://localhost:27017/moefetch";
        this.downloadFolder = downloadFolder ?? '../files'
        this.hostname = hostname ?? "http://127.0.0.1:2234";
        this.saucenao_api_key = saucenao_api_key ?? "";
        this.search_diff_sites = search_diff_sites ?? false;
        this.pixiv_download_first_image_only = pixiv_download_first_image_only ?? false;

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
