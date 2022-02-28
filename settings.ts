import fs from "fs";

interface ISettings {
    port: number;
    ip: string;
    hostname: string;
    database_url: string;

}

/**
 * Creates a settings JSON and loads it from the same folder the executable is in
 * stolen from Taku by Geoxor 
 */
class Settings implements ISettings{
    public port: number;
    public ip: string;
    public hostname: string ;
    public database_url: string;

    constructor(){
        !fs.existsSync("./settings.json") && this.save()
        const { port, ip, hostname, database_url} = JSON.parse(
            fs.readFileSync("./settings.json", { encoding: "utf-8" })
        ) as ISettings;
        this.ip = !!ip ? ip : "";
        this.port = port ?? 2234;
        this.database_url = database_url ?? "mongodb://localhost:27017/moefetch";
        this.hostname = hostname ?? "http://127.0.0.1:2234";

        this.save();

        console.log(this)
        return this;
    }

    save() {
        fs.writeFileSync("./settings.json", JSON.stringify(this, null, 2));
    }

}
export default new Settings();
