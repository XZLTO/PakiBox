const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function checkAdminRights() {
    console.log("test")
  try {
    const { stderr } = await execAsync('NET SESSION');
    // Если stderr пустая - есть права администратора
    return stderr.length === 0;
  } catch (error) {
    // Если ошибка - скорее всего нет прав
    return false;
  }
}

export {checkAdminRights}