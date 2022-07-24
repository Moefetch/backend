import fs from "fs";

interface ISettings {
    port: number;
    ip: string;
    initialSetup: boolean;
    hostname: string;
    database_url: string;
    saucenao_api_key: string;
    search_diff_sites: boolean;
    prefered_quality_highest_bool: boolean;
}

/**
 * Creates a settings JSON and loads it from the same folder the executable is in
 * stolen from Taku by Geoxor 
 */
class Settings implements ISettings {
    public port: number;
    public ip: string;
    public initialSetup: boolean;
    public hostname: string ;
    public database_url: string;
    public saucenao_api_key: string;
    public search_diff_sites: boolean;
    public prefered_quality_highest_bool: boolean;

    constructor(){
        !fs.existsSync("./settings.json") && this.save()
        const { port, ip, hostname, database_url, saucenao_api_key, initialSetup, search_diff_sites, prefered_quality_highest_bool} = JSON.parse(
            fs.readFileSync("./settings.json", { encoding: "utf-8" })
        ) as ISettings;
        this.ip = !!ip ? ip : "";
        this.initialSetup = initialSetup ?? false;
        this.port = port ?? 2234;
        this.database_url = database_url ?? "mongodb://localhost:27017/moefetch";
        this.hostname = hostname ?? "http://127.0.0.1:2234";
        this.saucenao_api_key = saucenao_api_key ?? "";
        this.search_diff_sites = search_diff_sites ?? false;
        this.prefered_quality_highest_bool = prefered_quality_highest_bool ?? false;
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
