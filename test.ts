import Logic from "./src/logic"
const logic = new Logic('0e9205838f5e690d780b38d8bcc2b41bd181073d')
const response = logic.getPixivImageData(97882826, true);

async function ass() {
    console.log('ass ' , await response)
}
ass()