import React, { useEffect, useState } from 'react'
import * as ReactDOM from 'react-dom/client';

import { SingBoxStatus } from './libs/data';
import Ansi from 'ansi-to-react/lib';

function App() {
  const [activeConfig, setActiveConfig] = useState('Германия');
  const [configs, setConfigs] = useState<string[]>([]);
  const [status, setStatus] = useState<SingBoxStatus>('stopped');
  const [logs, setLogs] = useState<{ Time: string, Text: string }[]>([]);
  const [appVersion,setAppVersion] = useState("");


  const actions: { name: string, fn: () => void }[] =
    [
      {
        name: "Удалить",
        fn: () => {
          window.electron.ipcRenderer.sendMessage("delete-config", activeConfig)
        }
      }
    ]

  function Log(log: string) {
    setLogs(prevLogs => [
      { Time: new Date().toLocaleTimeString(), Text: log },
      ...prevLogs
    ].slice(0, 500));
  }

  useEffect(() => {
    const offLog = window.electron.ipcRenderer.on("sing-log", Log);
    const offProfiles = window.electron.ipcRenderer.on("get-configs", (configs: string[], lastConfig: string) => {
      setConfigs(configs);
      setActiveConfig(lastConfig || configs[0] || "Конфиг не выбран :(");
    });
    const offStatus = window.electron.ipcRenderer.on("sing-status", (status: SingBoxStatus) => {
      setStatus(status)
    });
    const offVersion = window.electron.ipcRenderer.on("getVersion", (version: string) => {
      setAppVersion(version)
    });

    window.electron.ipcRenderer.sendMessage("getVersion")
    window.electron.ipcRenderer.sendMessage("get-configs")

    return () => {
      offLog()
      offProfiles()
      offStatus()
      offVersion()
    };
  }, []);

  const statusConfig = {
    'active': {
      bg: 'bg-green-500',
      text: 'Запушено',
    },
    'stopped': {
      bg: 'bg-red-500',
      text: 'Остановлен',
    },
    'starting': {
      bg: 'bg-yellow-500',
      text: 'Запускаем',
    },
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Заголовок и управление */}
      <div className="flex justify-between items-center p-6 border-b bg-white dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          PakiBox <span className="text-xs text-gray-400 dark:text-gray-200">{appVersion}</span>
        </h1>
        <div className="flex gap-3">
          <button
            className={`px-4 py-2 rounded ${statusConfig[status].bg} text-white hover:opacity-90`}
            onClick={() => {
              if (status != 'starting')
                if(configs.includes(activeConfig))
                  window.electron.ipcRenderer.sendMessage("sing-runner", activeConfig)
                else
                  Log("\x1b[31m[Error]\x1b[0m:Конфиг не выбран!")
            }}
          >
            {statusConfig[status].text}
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-4 gap-2 p-2 overflow-hidden no-scrollbar h-full">
        {/* Боковая панель профилей */}
        <div className="flex flex-col gap-2 min-w-[50px] h-full overflow-hidden">
          <section className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex flex-col gap-4 h-full overflow-hidden">

            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Активный конфиг:</p>
              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded text-sm truncate dark:text-blue-200">
                {activeConfig}
              </div>
            </div>

            <h3 className="font-medium dark:text-gray-100">Профили</h3>
            <div className="flex-col gap-1 overflow-y-scroll min-h-0 no-scrollbar">
              {configs.map((profile, i) => (
                <button
                  key={i}
                  className={`w-full text-left p-2 rounded cursor-pointer truncate ${activeConfig === profile
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    } dark:text-gray-200`}
                  onClick={() => { setActiveConfig(profile); Log("Change profile to: " + profile) }}
                >
                  {i + 1}. {profile}
                </button>
              ))}
            </div>

            <div className="pt-4 border-t dark:border-gray-700">
              <h3 className="font-medium mb-2 dark:text-gray-100">Управление</h3>
              {actions.map((action, i) => (
                <button
                  key={i}
                  className="w-full p-2 text-left rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
                  onClick={action.fn}
                >
                  {i + 1}. {action.name}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Основная область логов */}
        <div className="col-span-3 flex flex-col h-full overflow-hidden">
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col h-full">
            <div className="p-4 border-b dark:border-gray-700 flex-col">
              <h2 className="font-semibold dark:text-gray-100">Логи</h2>
            </div>
            <div className="flex-1 overflow-y-scroll min-h-0 no-scrollbar">
              <div className="font-mono text-sm">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className="p-1 rounded odd:bg-gray-100 dark:odd:bg-gray-700/30 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors break-words dark:text-gray-300"
                  >
                    <span className="text-xs text-blue-600 dark:text-blue-400">{log.Time}</span> <Ansi>{log.Text}</Ansi>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
              <button
                className={`px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:opacity-90`}
                onClick={() => {
                  setLogs([]);
                }}
              >
                Очистить
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

function render() {
  const root = ReactDOM.createRoot(document.getElementById("app"));
  root.render(<App />);

}

render();
