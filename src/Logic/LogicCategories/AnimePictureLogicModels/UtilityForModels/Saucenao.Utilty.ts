import fs from "fs";
import stream from "stream";

import { IParamValidityCheck, IModelSpecialParam, ISaucenaoResult, ISaucenaoResultObj } from "types";

import FormData from "form-data";
import fileType from "file-type";

/**
 * creates a sauceNao instance
 * @param api_key api_key you get from https://saucenao.com/user.php?page=search-api
 */
export class sauceNao {

  static specialSettingsParam:IModelSpecialParam = {
    "saucenao_api_key" : {
      type:"setting",
      valueType: "both",
      checkBox: {
        checkBoxValue: false,
        checkBoxDescription: "Use SauceNao to search different sites for possibly higher quality ",
        defaultValue: false,
      },
      textField: {
        value: "",
        fieldPlaceholder: "Saucenao API key (for the option above)",
        defaultValue: "",
      }
    }
  }
  static specialSettingsParamValidityCheck:IParamValidityCheck[] = [
    {
    indexer: ["special_settings", "Anime Picture", "specialCategorySettings", "saucenao_api_key"],
    checkValid: async (
      enabledBool: boolean,
      stringValue?: string
    ) => {
      if (enabledBool) {
        if (stringValue) {
          let apiKeyCheck = await checkSauceNAOApi(stringValue);
          if (apiKeyCheck) {
            return undefined;
          } else
          return "SauceNao api key invalid or expired";
        } else {
          return "No saucenao api key was provided";
        }
      }
    }
  }
]
  
  public api_key: string | undefined;

  /**
   *
   * @param input the path to teh faile you want the sauce (source) of
   * @returns
   */
  public async getSauce(input: any): Promise<ISaucenaoResultObj> {
    //might add options feild later
    let form = new FormData();
    let imgInputType: "url" | "file" | "readable stream" | "buffer";
    form.append("output_type", 2);
    if (this.api_key) form.append("api_key", this.api_key);

    switch (true) {
      case typeof input === "string":
        if (~input.search(/^https?:\/\//)) {
          form.append("url", input);
          imgInputType = "url";
        } else {
          form.append("file", fs.createReadStream(input));
          imgInputType = "file";
        }
        break;

      case input instanceof stream.Readable:
        form.append("file", input);
        imgInputType = "readable stream";
        break;

      case input instanceof Buffer:
        let inputType = await fileType.fromBuffer(input);
        form.append("file", input, {
          filename: `file.${inputType?.ext}`,
          contentType: inputType?.mime,
        });
        imgInputType = "buffer";

        break;

      default:
        throw new TypeError("unrecognized input format");
    }
    let response = await new Promise<any>((resolve, reject) => {
      form.submit("https://saucenao.com/search.php", (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    try {
      response.body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk: any) => (response.body += chunk));
      await new Promise((r) => response.on("end", r));

      response.json = JSON.parse(response.body);
      //console.log(response.json.results[0].data)
    } catch (err) {
      console.log(err); //err.response = response
      throw err;
    }

    return {
      resultArray: response.json.results,
      inputType: imgInputType,
    };
  }

  constructor(api_key: string) {
    this.api_key = api_key;
  }

  
}

export async function checkSauceNAOApi(sauceNaoApi: string) {
  const testUrl = "https://i.imgur.com/6qNnzQg.jpeg";
  const sauceNaoTest = new sauceNao(sauceNaoApi);
  const response = await sauceNaoTest.getSauce(testUrl);
  return response.resultArray ? true : false;
}

export default sauceNao;

