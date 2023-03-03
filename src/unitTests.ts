/* import Logic from "./logic";
import ISetting from "../settings";

const logic = new Logic(ISetting);





async function doAyncShit() {
    console.log(await logic.processPixivId('100278961'))
    
} 
doAyncShit()

//unitTest('logic.request works with url and method as input', (args: string) => (logic.request(args, 'GET').then(r => r.text())), 'https://i.imgur.com/6qNnzQg', output_1  )
//unitTest('download', logic.downloadFromUrl('https://i.imgur.com/6qNnzQg.jpeg', './',), '' ,'' )
async function unitTest(testName: string,functionToTest: Function, input: any,  output: any) {
    console.log('Test: ', '\x1b[36m', testName, '\x1b[0m'); 
    const res = await functionToTest(input);
    if (res == output) {
        console.log('\x1b[32m%s\x1b[0m', 'Test passed');
        
    } else console.log('\x1b[31m%s\x1b[0m', 'Test failed', '\n the output was: ', res);
    
}

 */