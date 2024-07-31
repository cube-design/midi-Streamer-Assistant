try {
    var runtimes = require("./src/runtimes.js");
    var getPosInteractive = require("./src/getPosInteractive.js");
    var MidiDeviceManager = require("./src/midiDeviceManager.js");
    var GameProfile = require("./src/gameProfile.js");
    var { playerType, AutoJsGesturePlayer } = require("./src/players.js");
    var configuration = require("./src/configuration.js");
    var FloatButton = require("./src/FloatButton/FloatButton.js");
    var language = require("./src/language.js");
} catch (e) {
    toast("Module loading error");
    toast(e);
    console.error(e);
}

const scriptVersion = 27;

//应用名称, 稍后会被初始化
let appName = undefined;
let gameProfile = new GameProfile();

const setGlobalConfig = configuration.setGlobalConfig;
const readGlobalConfig = configuration.readGlobalConfig;

/**
 * @brief 导出数据的格式类型
 * @enum {string}
 */
const ScoreExportType = {
    none: "none",
    keyboardScore: "keyboardScore",
    keySequenceJSON: "keySequenceJSON",
};

/**
 * @enum {string}
 */
const ScriptOperationMode = {
    NotRunning: "NotRunning",
    FilePlayer: "FilePlayer",
    MIDIInputStreaming: "MIDIInputStreaming",
};

/**
 * @enum {string}
 */
const MusicLoaderDataType = {
    GestureSequence: "GestureSequence",
    KeySequence: "KeySequence",
    KeySequenceHumanFriendly: "KeySequenceHumanFriendly",
};

const languagelist = language.getLanguageList();
const tsl = language.tsl;
var langType = readGlobalConfig("languageType", -1); //默认语言选项
var gametsl;
/**
     * @type {Array<pos2d>?}
     * @description 按键位置数组(从下到上, 从左到右)
     */
var cachedKeyPos = null;//自定义坐标的数值

var keyStates = new Map();//实时保存midi键按下弹起状态，长按用
var type = null ;//异形屏适配:0平板全屏，1左侧挖孔刘海药丸，2翻转后位于屏幕右侧

/**
 * @brief 加载配置文件
 */
function loadConfiguration() {
    try {
        // TODO: 自定义配置
        let userGameProfile = readGlobalConfig("userGameProfile", null);
        if (userGameProfile != null) {
            gameProfile.loadGameConfigs(userGameProfile);
        } else {
            gameProfile.loadDefaultGameConfigs();
        }
        let lastConfigName = readGlobalConfig("lastConfigName", "");
        //尝试加载用户设置的游戏配置
        let activeConfigName = readGlobalConfig("activeConfigName", null);
        let res = gameProfile.setConfigByName(activeConfigName);
        //尝试通过包名加载游戏配置 (加载失败后保留当前配置)
        if (auto.service != null) {
            let currentPackageName = currentPackage();
            res = gameProfile.setConfigByPackageName(currentPackageName);
            if (res == false) {
            } else {
                //保存当前配置
                setGlobalConfig("activeConfigName", gameProfile.getCurrentConfigTypeName());
            }
        } else {
        }

        if (gameProfile.getCurrentConfig() == null) {
            console.error(tsl(4, langType,"Appropriate configuration not found, default configuration loaded!"));
            toast(tsl(4, langType,"Appropriate configuration not found, default configuration loaded!"));
        }

        if (lastConfigName != gameProfile.getCurrentConfigTypeName()) {
            //如果配置发生了变化, 则清空上次的变体与键位配置
            setGlobalConfig("lastConfigName", gameProfile.getCurrentConfigTypeName());
            setGlobalConfig("lastVariantName", "");
            setGlobalConfig("lastKeyTypeName", "");
        }

        //加载变体配置和键位配置
        let lastVariantName = readGlobalConfig("lastVariantName", "");
        if (lastVariantName != "") {
            let res = gameProfile.setCurrentVariantByTypeName(lastVariantName);
            if (res == false) {
                gameProfile.setCurrentVariantDefault();
            } else {
            }
        } else {
            gameProfile.setCurrentVariantDefault();
        }
        setGlobalConfig("lastVariantName", gameProfile.getCurrentVariantTypeName());

        let lastKeyTypeName = readGlobalConfig("lastKeyTypeName", "");
        if (lastKeyTypeName != "") {
            let res = gameProfile.setCurrentKeyLayoutByTypeName(lastKeyTypeName);
            if (res == false) {
                gameProfile.setCurrentKeyLayoutDefault();
            } else {
            }
        } else {
            gameProfile.setCurrentKeyLayoutDefault();
        }
        setGlobalConfig("lastKeyTypeName", gameProfile.getCurrentKeyLayoutTypeName());

    } catch (error) {
        toastLog(tsl(5, langType,"Failed to load the configuration file, default configuration loaded!"));
        console.warn(error);
        gameProfile.loadDefaultGameConfigs();
        setGlobalConfig("userGameProfile", null);
    }
}

/**
 * 启动midi串流
 * @returns {{
 *  onDataReceived: (callback: (data: Array<Uint8Array>) => void) => void,
 *  close: () => void,
 * } | null}
 */
function setupMidiStream() {
    const midiEvt = events.emitter(threads.currentThread());
    /** @type {MidiDeviceManager} */
    //@ts-ignore
    let midi = null;
    const midiThread = threads.start(function () {
        setInterval(function () {}, 1000);
        midi = new MidiDeviceManager();
    });
    midiThread.waitFor();
    while (midi == null) {
        sleep(100);
    }
    let devNames = [];
    while (1) {
        devNames = midi.getMidiDeviceNames();
        if (devNames.length == 0) {
            if (!dialogs.confirm(
                tsl(7, langType,"Error"), 
                tsl(8, langType,"Not Found MIDI device, Click OK to repeat, Click cancel to quit")
                )) {
                return null;
            }
        } else {
            break;
        }
    }
    let deviceIndex = dialogs.select(tsl(9, langType,"Choose MIDI device"), devNames);
    if (deviceIndex == -1) {
        toast(tsl(12, langType,"You canceled choosing"));
        return null;
    }
    let portNames = midi.getMidiPortNames(deviceIndex);
    if (portNames.length == 0) {
        dialogs.alert(tsl(7, langType,"Error"), tsl(15, langType,"This MIDI device has no available ports"));
        return null;
    }
    let portIndex = 0;
    if (portNames.length > 1) {  // 不太可能出现
        portIndex = /** @type {Number} */ (dialogs.select(tsl(16, langType,"Choose MIDI ports"), portNames));
        if (portIndex == -1) {
            toast(tsl(12, langType,"You canceled choosing"));
            return null;
        }
    }
    midiThread.setImmediate(() => {
        midi.openDevicePort(deviceIndex, portIndex);
        midi.setDataReceivedCallback(() => {
            midiEvt.emit("dataReceived");
        });
    });

    let _onDataReceived = (data) => { };

    midiEvt.on("dataReceived", () => {
        let keyList = [];
        if (!midi.dataAvailable()) {
            return;
        }
        while (midi.dataAvailable()) {
            _onDataReceived(midi.readAll());
        }
    });

    return {
        onDataReceived: (callback) => {
            _onDataReceived = callback;
        },
        close: () => {
            midi.close();
            midiThread.interrupt();
        }
    }
}

function checkEnableAccessbility() {
    //启动无障碍服务
    console.verbose(tsl(17, langType,"Waiting for accessibility services..."));
    //toast("请允许本应用的无障碍权限");
    if (auto.service == null) {
        toastLog(tsl(18, langType,"Please Open ") + appName + tsl(19, langType," accessibility Permission!"));
        auto.waitFor();
        toastLog(tsl(20, langType,`Accessibility services have opened!`));
        return false;
    }
    toastLog(tsl(20, langType,`Accessibility services have opened!`));
    console.verbose(tsl(21, langType,"Accessibility services have started"));
    return true;
}

function saveUserGameProfile() {
    let profile = gameProfile.getGameConfigs();
    setGlobalConfig("userGameProfile", profile);
    toast(tsl(6, langType,"User game configuration saved"));
};

function runClickPosSetup() {
    let pos1 = getPosInteractive(tsl(26, langType,"the center of the top-leftmost button"),type);
    let pos2 = getPosInteractive(tsl(27, langType,"the center of the bottom-rightmost button"),type);
    gameProfile.setKeyPosition([pos1.x, pos1.y], [pos2.x, pos2.y]);
    saveUserGameProfile();
}

function getTargetTriple() {
    let configName = gameProfile.getCurrentConfigDisplayName();
    let variantName = gameProfile.getCurrentVariantDisplayName();
    let keyTypeName = gameProfile.getCurrentKeyLayoutDisplayName();
    switch (configName){ //"Sky", "Genshin", "Identity V", "Customize"
        case "Sky" :
            configName = tsl(76,langType,"Sky");
            break;
        case "Genshin" :
            configName = tsl(68,langType,"Genshin");
            break;
        case "Identity V" :
            configName = tsl(67,langType,"Identity V");
            break;
        case "Customize" :
            configName = tsl(71,langType,"Customize");
            break;
        }
    switch (variantName){ //"Windsong Lyre", "Vintage Lyre"
        case "Windsong Lyre" :
            variantName = tsl(69,langType,"Windsong Lyre");
            break;
        case "Vintage Lyre" :
            variantName = tsl(70,langType,"Vintage Lyre");
            break;
        }
    return configName + " " + variantName + " " + keyTypeName;
}


/////////
//主程序//
/////////
function initialize() {
    let currentRuntime = runtimes.getCurrentRuntime();
    switch (currentRuntime) {
        case runtimes.Runtime.AUTOJS6:
            console.info("Current operating environment: AutoJs6");
            break;
        case runtimes.Runtime.AUTOXJS:
            console.info("Current operating environment: AutoX.js");
            break;
        default:
            console.warn("Current operating environment: Unsupported or unknown!");
            break;
    }
    if (readGlobalConfig("lastVersion", 0) != scriptVersion) {
        //第一次启动，初始化设置
        toast(tsl(2, langType,"Initializing.."));
        configuration.clear();
        if (readGlobalConfig("skipInit", -1) == -1) setGlobalConfig("skipInit", true);
        if (readGlobalConfig("skipBlank5s", -1) == -1) setGlobalConfig("skipBlank5s", false);
        if (readGlobalConfig("waitForGame", -1) == -1) setGlobalConfig("waitForGame", true);
        setGlobalConfig("userGameProfile", null);
        setGlobalConfig("lastVersion", scriptVersion);
    };
}

function main() {
    let evt = events.emitter(threads.currentThread());

    const haveFloatyPermission = runtimes.getCurrentRuntime() === runtimes.Runtime.AUTOXJS ?
        floaty.checkPermission() :
        floaty.hasPermission();
    if (!haveFloatyPermission) {
        // 没有悬浮窗权限，提示用户并跳转请求
        toastLog(tsl(22, langType,"Please open ") + appName + tsl(23 , langType," Floating window Permission!"));
        floaty.requestPermission();
        while (!floaty.checkPermission());
        toastLog(tsl(24, langType,'Floating window Permission has been opened'));
    }

    let titleStr = tsl(35, langType,"Click to adjust position");
    console.info(titleStr);
    /**
     * @type {Array<import("./src/players").PlayerBase>}
     */
    let selectedPlayers = [new AutoJsGesturePlayer()];
    let instructWindow = null;

    //显示悬浮窗
    /**
     * @type {any}
     */
    let controlWindow = floaty.window(
        <frame gravity="left|top" w="120dp" h="50dp" margin="0dp" id="controlWindowFrame" visibility="gone">
            <vertical bg="#55ffffff" w="120dp" h="auto" margin="0dp">
                <horizontal w="120dp" h="auto" margin="0dp">
                    <text id="musicTitleText" bg="#55ffffff" w="120dp" text="Click to adjust position" ellipsize="marquee" singleLine="true" layout_gravity="center" textSize="14sp" margin="0 0 0 0" layout_weight="1" />
                </horizontal>
                <horizontal bg="#88ffffff" w="120dp" h="auto" margin="0dp" gravity="left">
                    <button id="gameBtn" style="Widget.AppCompat.Button.Borderless" w="30dp" h='30dp' text="🎮" textSize="20sp" margin="0dp" padding="0dp" />
                    <button id="posBtn" style="Widget.AppCompat.Button.Borderless" w="30dp" h='30dp' text="📍" textSize="20sp" margin="0dp" padding="0dp" />
                    <button id="midiBtn" style="Widget.AppCompat.Button.Borderless" w="30dp" h='30dp' text="🎹" textSize="20sp" margin="0dp" padding="0dp" />
                    <button id="globalConfigBtn" style="Widget.AppCompat.Button.Borderless" w="30dp" h='30dp' text="⚙️" textSize="20sp" margin="0dp" padding="0dp" />
                </horizontal>
            </vertical>
        </frame>
    );
    let controlWindowVisible = false;
    /**
     * @param {boolean} visible
     */
    function controlWindowSetVisibility(visible) {
        ui.run(() => {
            if (visible) {
                controlWindow.controlWindowFrame.setVisibility(android.view.View.VISIBLE);
            } else {
                controlWindow.controlWindowFrame.setVisibility(android.view.View.GONE);
            }
        });
    }

    ui.run(() => {
        controlWindow.musicTitleText.setText(titleStr);
        controlWindow.musicTitleText.setSelected(true);
    });

    controlWindow.gameBtn.click(() => {
        evt.emit("gameBtnClick");
    });
    controlWindow.posBtn.click(() => {
        evt.emit("posBtnClick");
    });
    controlWindow.midiBtn.click(() => {
        evt.emit("midiBtnClick");
    });
    
    controlWindow.globalConfigBtn.click(() => { evt.emit("globalConfigBtnClick"); });

    //悬浮窗位置/大小调节
    let controlWindowPosition = readGlobalConfig("controlWindowPosition", [device.width / 4, device.height / 5 ]);
    //避免悬浮窗被屏幕边框挡住
    controlWindow.setPosition(controlWindowPosition[0], controlWindowPosition[1]);
    let controlWindowSize = readGlobalConfig("controlWindowSize", [-2, -2]);
    controlWindow.setSize(controlWindowSize[0], controlWindowSize[1]);
    //controlWindow.setTouchable(true);

    let controlWindowLastClickTime = 0;
    //悬浮窗事件
    controlWindow.musicTitleText.on("click", () => {
        let now = new Date().getTime();
        if (now - controlWindowLastClickTime < 500) {
            toast(tsl(36, langType,"Reset floating window and position"));
            controlWindow.setSize(-2, -2);
            controlWindow.setPosition(device.width / 4, device.height / 5);
        }
        controlWindowLastClickTime = now;

        let adjEnabled = controlWindow.isAdjustEnabled();
        controlWindow.setAdjustEnabled(!adjEnabled);

        //记忆位置
        if (adjEnabled) {
            controlWindow.setSize(controlWindow.getWidth(), controlWindow.getHeight());
            setGlobalConfig("controlWindowPosition", [controlWindow.getX(), controlWindow.getY()]);
            setGlobalConfig("controlWindowSize", [controlWindow.getWidth(), -2]);
        }
    });

    function exitApp() {
        if(instructWindow != null) instructWindow.close();
        controlWindow.close();
        threads.shutDownAll();
        exit();
    }


    let diy = false;//diy
    let diybool = false;//延音开关
    var diytime = 20;//默认10ms
    var diysleeptime = 0;//默认5ms

    evt.on("gameBtnClick", () => {
        //目标游戏
        let configList = gameProfile.getConfigNameList();
        let sel = /** @type {Number} */ (dialogs.select(tsl(44, langType,"Choose target game..."), [tsl(76,langType,"Sky"), tsl(68,langType,"Genshin"), tsl(67,langType,"Identity V"), tsl(71,langType,"Customize")]));
        let configName = readGlobalConfig("activeConfigName",null);
        if (sel == -1) {
            if (configName == null){
                toastLog(tsl(47 , langType,"Game not selected"));
                return;
            }
            toastLog(tsl(50 , langType,"Setting no changed"));
            return;
        }
        else if (sel == 3){
            diy = true;
            configName = configList[sel];
        }else {
            diy = false;
            configName = configList[sel];
        }
        setGlobalConfig("activeConfigName", configName);
        setGlobalConfig("lastConfigName", configName);
        gameProfile.setConfigByName(configName);
        //目标乐器
        let instrumentList = gameProfile.getCurrentAvailableVariants();
        if (instrumentList == null || instrumentList.length == 0) {
            throw new Error(tsl(48, langType,"There are no available instruments in the current game!"));
        } else if (instrumentList.length == 1) {
            gameProfile.setCurrentVariantDefault();
            setGlobalConfig("lastVariantName", gameProfile.getCurrentVariantTypeName());
        } else {
            let nameList = instrumentList.map((variant) => variant.variantName);
            let sel = /** @type {Number} */ (dialogs.select(tsl(45, langType,"Choose target instrumental..."), [tsl(69,langType,"Windsong Lyre"), tsl(70,langType,"Vintage Lyre")]));
            if (sel == -1) {
                toastLog(tsl(50, langType,"Setting no changed"));
            }
            let typeName = instrumentList[sel].variantType;
            gameProfile.setCurrentVariantByTypeName(typeName);
            setGlobalConfig("lastVariantName", typeName);
        }
        //目标键位
        let keyLayoutList = gameProfile.getCurrentAvailableKeyLayouts();
        if (keyLayoutList == null || keyLayoutList.length == 0) {
            throw new Error(tsl(49, langType,"There are no available keys in the current game!"));
        } else if (keyLayoutList.length == 1) {
            gameProfile.setCurrentKeyLayoutDefault();
            setGlobalConfig("lastKeyTypeName", gameProfile.getCurrentKeyLayoutTypeName());
        } else {
            let allKeyLayoutList = gameProfile.getAllKeyLayouts();
            let nameList = keyLayoutList.map((keyLayout) => allKeyLayoutList[keyLayout].displayName);
            console.log(nameList);
            let sel = /** @type {Number} */ (dialogs.select(tsl(46, langType,"Choose target Key Position..."), nameList));
            if (sel == -1) {
                toastLog(tsl(50 , langType,"Setting no changed"));
            }
            let typeName = keyLayoutList[sel];
            gameProfile.setCurrentKeyLayoutByTypeName(typeName);
            setGlobalConfig("lastKeyTypeName", typeName);
        }
        toastLog(tsl(51, langType,"Setting saved"));
        titleStr = tsl(63, langType,"Current configuration: ") + getTargetTriple();
        ui.run(() => {
            controlWindow.musicTitleText.setText(titleStr);
        });
    });
    evt.on("posBtnClick", () => {
        //设置坐标
        type = readGlobalConfig("type",null);
        if (type == null || type == -1){
            type = (dialogs.select(tsl(52, langType,"Screen adaptation: ") , [tsl(53, langType,"Full screen"),tsl(54, langType,"Camera module on the Left side"),tsl(55, langType,"Camera module on the Right side")]));
            setGlobalConfig("type",type);
        }
        if (type > -1){
            runClickPosSetup();
        }
    });
    evt.on("midiBtnClick", () => {
        //MIDI串流
        evt.emit("midiStreamStart");
    });
    evt.on("globalConfigBtnClick", () => {
        switch (dialogs.select(tsl(58, langType,"Advanced Option"),
            ["📱" + tsl(52, langType,"Screen adaptation"),
             "🔍" + tsl(42, langType,"Customize coordinates"),
             "⏳" + tsl(43, langType,"Sustain settings"),
             "💬" + tsl(0 , langType,"语言/Language/言語"),
             "⚠️" + tsl(41, langType,"Permission Check"),
            ])) {
            case -1:
                break;
            case 0:
                type = (dialogs.select(tsl(52, langType,"Screen adaptation: "),[tsl(53, langType,"Full screen"),tsl(54, langType,"Camera module on the Left side"),tsl(55, langType,"Camera module on the Right side")]));
                if (type == -1){
                    break;
                }
                setGlobalConfig("type",type);
                break;
            case 1://diy
                //切换配置至口袋琴自定义
                if (diy == false ){
                    setGlobalConfig("activeConfigName", "Customize coordinates");
                    setGlobalConfig("lastConfigName", "Customize coordinates义");
                    gameProfile.setConfigByName("Customize coordinates");
                    gameProfile.setCurrentVariantDefault();
                    setGlobalConfig("lastVariantName", gameProfile.getCurrentVariantTypeName());
                    gameProfile.setCurrentKeyLayoutDefault();
                    setGlobalConfig("lastKeyTypeName", gameProfile.getCurrentKeyLayoutTypeName());
                    diy = true;
                }

                if ((cachedKeyPos = readGlobalConfig("diyPos",null)) == null) {//首次使用初始化
                    cachedKeyPos = gameProfile.getAllKeyPositions();
                }
                let diyx = (dialogs.select(tsl(42, langType,"Customize coordinates"), [tsl(72 , langType,"Row1"),tsl(73, langType,"Row2"),tsl(74, langType,"Row3")]));
                if (diyx == -1 ){
                    break;
                }else {
                    let diyy = (dialogs.select(tsl(75 , langType,"Column"), ["1","2","3","4","5"]));
                    if (diyy == -1){
                        break;
                    }
                    diypos(diyx , diyy);
                }
                titleStr = tsl(63 , langType,"Current configuration:") + getTargetTriple();
                ui.run(() => {
                    controlWindow.musicTitleText.setText(titleStr);
                });
                break;
            case 2://延音开关 自定义延音频率以适配不同游戏 及 防止低配手机卡顿
                if (diybool){
                    let sel =(dialogs.select(tsl(43, langType,"Sustain settings"),["🔴" + tsl(56, langType,"Sustain Started"),tsl(58, langType,"Advanced Option")]));
                    if (sel == 0){
                        diybool = false;
                        break;
                    }else if (sel == 1){
                        let sel =(dialogs.select(tsl(58, langType,"Advanced Option"),[tsl(59, langType,"Frequency duration:") + diytime + "ms",tsl(60, langType,"Delay:") + diysleeptime + "ms"]))
                        if (sel == 0){
                            diytime = dialogs.input(tsl(61 , langType,"Lower when disrupted tone.Suggested range:5-100") , diytime);
                            //输入非整型会报错，待完善diytime = diytime.replace(/[^\d]/g, "");//正则表达式过滤掉非数字字符
                            break;
                        }else if (sel ==1){
                            diysleeptime = dialogs.input(tsl(62 , langType,"Raise when stuttering, Lower when disrupted tone.Suggested range:0-50") , diysleeptime);
                            break;
                        }else {
                            break;
                        }
                    }else {
                        break;
                    }
                }else {
                    let sel =(dialogs.select(tsl(43 , langType,"Sustain settings"),["⭕" + tsl(57, langType,"Sustain Closed"),tsl(58, langType,"Advanced Option")]));
                    if (sel == 0){
                        diybool = true;
                        break;
                    }else if (sel == 1){
                        let sel =(dialogs.select(tsl(58, langType,"Advanced Option"),[tsl(59, langType,"Frequency duration:") + diytime + "ms",tsl(60, langType,"Delay:") + diysleeptime + "ms"]))
                        if (sel == 0){
                            diytime = dialogs.input(tsl(61 , langType,"Lower when disrupted tone.Suggested range:5-100") , diytime);
                            //输入非整型会报错，待完善diytime = diytime.replace(/[^\d]/g, "");//正则表达式过滤掉非数字字符
                            break;
                        }else if (sel ==1){
                            diysleeptime = dialogs.input(tsl(62 , langType,"Raise when stuttering, Lower when disrupted tone.Suggested range:0-50") , diysleeptime);
                            break;
                        }else {
                            break;
                        }
                    }else {
                        break;
                    }
                }
            case 3:
                let sel = dialogs.select(tsl(0, langType,"Language"), languagelist);
                if (sel == -1){
                    break;
                }else {
                    langType = sel;
                    setGlobalConfig("languageType", langType);
                    toast(tsl(1,langType,"NULL"));
                    console.log(tsl(1,langType,"NULL"));
                }
                break;
            case 4:
                checkEnableAccessbility();
                break;
        };
    });
    evt.on("midiStreamStart", () => {
        const stream = setupMidiStream();
        if (stream == null) {
            toast(tsl(13 , langType,"MIDI Connection Failed!"));
            return;
        }
        toast(tsl(14 , langType,"MIDI Connection Success!"));
        operationMode = ScriptOperationMode.MIDIInputStreaming;
        ui.run(() => {
            controlWindow.musicTitleText.setText(tsl(64 , langType,"MIDI streaming..."));
        });
        stream.onDataReceived(function (datas) {
            const STATUS_COMMAND_MASK = 0xF0;
            const STATUS_CHANNEL_MASK = 0x0F;
            const STATUS_NOTE_OFF = 0x80;
            const STATUS_NOTE_ON = 0x90;
            let keyList = new Array();
            for (let data of datas) {
                let cmd = data[0] & STATUS_COMMAND_MASK;
                let key = gameProfile.getKeyByPitch(data[1]);
                switch(cmd){
                    case 144:
                        keyStates.set(key,true);
                        break;
                    case 128:
                        keyStates.set(key,false);
                        break;
                }
                if (diybool == false && cmd == STATUS_NOTE_ON && data[2] != 0) { // velocity != 0
                    if (key != -1 && keyList.indexOf(key) === -1) keyList.push(key);
                }
            }
            if (diybool ==false){
                let gestureList = new Array();
                for (let j = 0; j < keyList.length; j++) { //遍历这个数组
                    let key = keyList[j];
                    if (diy && cachedKeyPos != null ){//自定义开启，且有改过坐标，否则默认位置
                        gestureList.push([0, 50, cachedKeyPos[key]]); 
                    }else {
                        gestureList.push([0, 50, gameProfile.getKeyPosition(key)]); 
                    }
                };
                if (gestureList.length > 10) gestureList.splice(9, gestureList.length - 10); //手势最多同时只能执行10个

                if (gestureList.length != 0) {
                    for (let player of selectedPlayers)
                        player.exec(gestureList);
                };
            }
        });

        threads.start(function(){
            while (true){//此线程一旦启动则不能关闭，否则线程失效且会重复启动
                if (diybool){
                    console.log(".........");
                    let keyList = new Array();
                    // 遍历键状态
                    keyStates.forEach((isPressed, keyNumber) => {
                    if (keyNumber != -1 && isPressed == true && keyList.indexOf(keyNumber) === -1) keyList.push(keyNumber);
                    });
                    let gestureList = new Array();
                    for (let j = 0; j < keyList.length; j++) { //遍历这个数组
                        let key = keyList[j];
                        if (diy && cachedKeyPos != null ){//自定义开启，且有改过坐标，否则默认位置
                            gestureList.push([0, diytime, cachedKeyPos[key]]); 
                        }else {
                            gestureList.push([0, diytime, gameProfile.getKeyPosition(key)]); 
                        }
                    };
                    if (gestureList.length > 10) gestureList.splice(9, gestureList.length - 10); //手势最多同时只能执行10个
    
                    if (gestureList.length != 0) {
                        for (let player of selectedPlayers)
                            player.exec(gestureList);
                    };

                    sleep(diysleeptime);
                }else {
                    sleep(500);
                }
            }
        });

    });
    evt.on("exitApp", () => {
        exitApp();
    });

    function controlWindowUpdateLoop() {
        if (controlWindow == null) {
            return;
        }
    }
    setInterval(controlWindowUpdateLoop, 200);

    //悬浮按钮
    let fb = new FloatButton();
    fb.setIcon('@drawable/ic_library_music_black_48dp');
    fb.setTint('#ffff00');
    fb.setColor('#019581');
    fb.addItem(tsl(65, langType,'Hide/Show the main floating window'))
        .setIcon('@drawable/ic_visibility_black_48dp')
        .setTint('#FFFFFF')
        .setColor('#019581')
        .onClick((view, name) => {
            controlWindowSetVisibility(!controlWindowVisible);
            controlWindowVisible = !controlWindowVisible;
            //返回 true:保持菜单开启 false:关闭菜单
            return false;
        });
    fb.addItem(tsl(66 , langType,'Quit'))
        .setIcon('@drawable/ic_exit_to_app_black_48dp')
        .setTint('#FFFFFF')
        .setColor('#019581')
        .onClick((view, name) => {
            evt.emit("exitApp");
            return true;
        });
    fb.show();
}


function diypos(diyx,diyy){
    let indexkey =10- diyx * 5 + diyy;
    diyx++;
    diyy++;
    let pos = getPosInteractive(tsl(28, langType,"Locate the button in row ") + diyx + tsl(29, langType," , column ") + diyy + tsl(30, langType," ."), type);
    cachedKeyPos[indexkey] = [Math.round(pos.x), Math.round(pos.y)];
    setGlobalConfig("diyPos",cachedKeyPos);
}

function start() {
    /**
     * see: https://github.com/kkevsekk1/AutoX/issues/672
     */
    if (runtimes.getCurrentRuntime() == runtimes.Runtime.AUTOXJS) {
        try {
            //Java, 启动!!!
            let deviceClass = device.getClass();
            let widthField = deviceClass.getDeclaredField("width");
            let heightField = deviceClass.getDeclaredField("height");
            widthField.setAccessible(true);
            heightField.setAccessible(true);
            widthField.setInt(device, context.getResources().getDisplayMetrics().widthPixels);
            heightField.setInt(device, context.getResources().getDisplayMetrics().heightPixels);
            let rotationListener = new JavaAdapter(android.view.OrientationEventListener, {
                onOrientationChanged: function (orientation) {
                    widthField.setInt(device, context.getResources().getDisplayMetrics().widthPixels);
                    heightField.setInt(device, context.getResources().getDisplayMetrics().heightPixels);
                }
            }, context);
            rotationListener.enable();
        } catch (e) {
            console.warn("Workaround failed");
            console.error(e);
        }
    }

    //获取真实的应用名称
    const packageManager = context.getPackageManager();
    appName = packageManager.getApplicationLabel(context.getApplicationInfo()).toString();
    initialize();
    loadConfiguration();
    main();
    console.info("Start completed");
}

start();