//@ts-check
var midiPitch = require("./midiPitch.js");

/**
 * @typedef {[number, number]} pos2d
 * @typedef {[pos2d, pos2d]} pos2dPair
 */

/**
 * @enum {string}
 */
const KeyLayoutTypes = {
    "grid": "grid",   //网格
    "arbitrary": "arbitrary", //任意
    "nshm_professional": "nshm_professional", //逆水寒手游, 所有的专业模式
}

/**
 * @enum {string}
 */
const KeyLocatorTypes = {
    //左上,右下(默认)
    "left_top_right_bottom": "left_top_right_bottom",
    //左下,右上
    "left_bottom_right_top": "left_bottom_right_top",
}

/**
 * @enum {string}
 * @typedef {string} NoteDurationImplementionType
 */
const NoteDurationImplementionTypes = {
    //根本不支持，所有音符都是一样长, 不管按住多久 //最简单
    "none": "none",
    //通过同时按住另外一个键来发出长音, 两种情况差别很大 //TODO:
    "extraLongKey": "extraLongKey",
    //原生支持, 按住多久就发出多长的音 //最难支持 //TODO:
    "native": "native",
}

/**
 * @enum {string}
 */
const FeatureFlags = {
    //是否有全部半音
    "hasAllSemitone": "hasAllSemitone",
}


/**
 * @typedef {Object.<string, number>} NoteKeyMap
 * @type {Object.<string, NoteKeyMap>}
 */
const noteKeyMaps = {
    "generic_3x7": {
        //音高与按键的映射, 左下角开始, 从左到右, 从下到上
        "C3": 1,
        "D3": 2,
        "E3": 3,
        "F3": 4,
        "G3": 5,
        "A3": 6,
        "B3": 7,
        "C4": 8,
        "D4": 9,
        "E4": 10,
        "F4": 11,
        "G4": 12,
        "A4": 13,
        "B4": 14,
        "C5": 15,
        "D5": 16,
        "E5": 17,
        "F5": 18,
        "G5": 19,
        "A5": 20,
        "B5": 21,
    },
    "sky_3x5": {
        // C4 D4 E4 F4 G4 
        // A4 B4 C5 D5 E5 
        // F5 G5 A5 B5 C6
        "F5": 1,
        "G5": 2,
        "A5": 3,
        "B5": 4,
        "C6": 5,
        "A4": 6,
        "B4": 7,
        "C5": 8,
        "D5": 9,
        "E5": 10,
        "C4": 11,
        "D4": 12,
        "E4": 13,
        "F4": 14,
        "G4": 15,
    },
    "sky_2x4": {
        // A4 E5 G5 A5
        // C6 D6 E6 G6  
        "C6": 1,
        "D6": 2,
        "E6": 3,
        "G6": 4,
        "A4": 5,
        "E5": 6,
        "G5": 7,
        "A5": 8,
    },
    "genshin_oldsq_3x7": {
        // C5 C#5 D#5 F5 G5 G#5 A#5
        // C4 D4 D#4 F4 G4 A4 A#4
        // C3 D3 D#3 F3 G3 A3 A#3
        "C3": 1,
        "D3": 2,
        "D3#": 3,
        "F3": 4,
        "G3": 5,
        "A3": 6,
        "A3#": 7,
        "C4": 8,
        "D4": 9,
        "D4#": 10,
        "F4": 11,
        "G4": 12,
        "A4": 13,
        "A4#": 14,
        "C5": 15,
        "C5#": 16,
        "D5#": 17,
        "F5": 18,
        "G5": 19,
        "G5#": 20,
        "A5#": 21,
    },
    "diy_3x5": {
        // C4 D4 E4 F4 G4 
        // A4 B4 C5 D5 E5 
        // F5 G5 A5 B5 C6
        "F5": 1,
        "G5": 2,
        "A5": 3,
        "B5": 4,
        "C6": 5,
        "A4": 6,
        "B4": 7,
        "C5": 8,
        "D5": 9,
        "E5": 10,
        "C4": 11,
        "D4": 12,
        "E4": 13,
        "F4": 14,
        "G4": 15,        
    },
}


/**
 * @typedef {{
 * displayName: string,
 * type: string,
 * locator: string,
 * row?: number|undefined,
 * column?: number|undefined,
 * relativeKeyPosition?: Array<pos2d>|undefined,
 * noteKeyMap?: NoteKeyMap,
 * }} KeyLayout
 * 
 * @type {Object.<string, KeyLayout>}
 */
const keyLayouts = {
    "generic_3x7": {
        //名称
        displayName: "3x7",
        //类型
        type: KeyLayoutTypes.grid,
        //定位方式
        locator: KeyLocatorTypes.left_top_right_bottom,
        //行数
        row: 3,
        //列数
        column: 7,
        //按键位置(只在定位方式为arbritary时有效), 左上角为(0,0), 左下角为(0,1), 右上角为(1,0), 右下角为(1,1). 顺序与noteKeyMap一致.
        relativeKeyPosition: undefined,
        //音高与按键的映射, 左下角开始, 从左到右, 从下到上
        noteKeyMap: noteKeyMaps.generic_3x7,
    },
    "sky_3x5": {   //光遇3x5
        displayName: "3x5",
        type: KeyLayoutTypes.grid,
        locator: KeyLocatorTypes.left_top_right_bottom,
        row: 3,
        column: 5,
        noteKeyMap: noteKeyMaps.sky_3x5,
    },
    "sky_2x4": { //光遇2x4
        displayName: "2x4",
        type: KeyLayoutTypes.grid,
        locator: KeyLocatorTypes.left_top_right_bottom,
        row: 2,
        column: 4,
        noteKeyMap: noteKeyMaps.sky_2x4,
    },
    "diy_3x5": {
        displayName: " ",
        type: KeyLayoutTypes.grid,
        locator: KeyLocatorTypes.left_top_right_bottom,
        row: 3,
        column: 5,
        noteKeyMap: noteKeyMaps.diy_3x5,
    },
};

//光遇: 乐曲调式对应的地图所在位置
//https://www.bilibili.com/read/cv15735140/
const skyTuneMapPosition = {
    "C": "遇境/晨岛沙漠地带/预言山谷中间/雨林第三个到第四个门之间（隐藏图入口）左侧有小金人的亭子/雨林四个金人的隐藏图的开头/雨林终点/霞光城/霞光城水底/禁阁地下室？/暴风眼第一阶段",
    "Db": "晨岛终点旁的小岛/云野八人图/雨林第四道门到终点之间小金人的亭子（隐藏图出口）/禁阁三楼",
    "D": "云野初始图后面/云野的中央大图（二图?）/云野右侧隐藏图（两个小破塔的那个）/圣岛/霞谷终点/霞谷迷宫/禁阁二楼/墓土三龙图/墓土终点/禁阁开头没到一楼的位置",
    "Eb": "雨林第三道门到第四道门中间右侧的有小金人的亭子/墓土无龙图/墓土方舟/墓土四龙图/墓土沉船",
    "E": "重生之路的星河",
    "F": "云野三塔的终点大塔/雨林两个金人的隐藏图/霞谷飞行赛道的城堡（中间有个球的那个小破城）/办公室两个入口之间/禁阁一楼",
    "Gb": "雨林第四道门到终点的最后一个塔",
    "G": "雨林初始图/晨岛飞往终点的悬崖",
    "Ab": "晨岛终点祭坛/预言山谷开头/霞谷赛道终点",
    "A": "霞谷开头的溜冰三岔口/禁阁终点祭坛/禁阁四楼小破塔顶",
    "Bb": "云野三塔图的二塔/雨林到霞谷的过渡图",
    "B": "禁阁二楼第一次变调后",
}

/**
 * 变体类型的具体配置
 * 游戏中会有不同的乐器, 它们共享同样的键位, 但音域可能不同. 
 * 因此使用这个类表示不同的变体
 * @typedef {{ 
 * variantType: string; 
 * variantName: string; 
 * availableNoteRange: [string,string] | undefined; 
 * noteDurationImplementionType: string; 
 * sameKeyMinInterval: number | undefined; 
 * noteKeyMap: Object.<string, number>| undefined; 
 * }} VariantConfigJson
 * @param {VariantConfigJson} json
 */
function VariantConfig(json) {
    /**
     * @type {string}
     * 变体类型
     */
    this.variantType = "";
    /**
     * @type {string}
     * 变体名称
     */
    this.variantName = "";
    /**
     * @type {[string,string] | undefined}
     * 可用音符范围[最小值,最大值]
     * @default undefined //表示使用noteKeyMap中的所有音符
     */
    this.availableNoteRange = undefined;
    /**
     * @type {string}
     * 音符时长的实现方式
     * @see NoteDurationImplementionTypes
     * @default "none"
     */
    this.noteDurationImplementionType = NoteDurationImplementionTypes.none;
    /**
     * @type {number | undefined}
     * 相同按键的最小间隔时间 (ms)
     * @default undefined //表示使用GameConfig中的值, 否则使用这个值 | 0表示不限制
     */
    this.sameKeyMinInterval = undefined;
    /**
     * @type {Object.<string, number> | undefined}
     * 音符按键映射表。如果为undefined则使用GameConfig中keyLayout对应noteKeyMap
     */
    this.noteKeyMap = undefined;

    /**
     * @param {VariantConfigJson} json
     */
    this.fromJSON = function (json) {
        this.variantType = json.variantType;
        this.variantName = json.variantName;
        this.availableNoteRange = json.availableNoteRange;
        this.noteDurationImplementionType = json.noteDurationImplementionType;
        this.sameKeyMinInterval = json.sameKeyMinInterval;
        this.noteKeyMap = json.noteKeyMap;
    }

    /**
     * @returns {VariantConfigJson}
     */
    this.toJSON = function () {
        return {
            variantType: this.variantType,
            variantName: this.variantName,
            availableNoteRange: this.availableNoteRange,
            noteDurationImplementionType: this.noteDurationImplementionType,
            sameKeyMinInterval: this.sameKeyMinInterval,
            noteKeyMap: this.noteKeyMap,
        };
    }

    if (json) {
        this.fromJSON(json);
    }
};

function GameConfig(json) {
    /**
     * @type {string}
     * 游戏类型
     * 可以为任意值
     */
    this.gameType = "";

    /**
     * @type {string}
     * 游戏名称
     * 可以为任意值
     */
    this.gameName = "";

    /**
     * @type {Array<string>}
     * 可用的键位类型
     */
    this.keyTypes = [];

    /**
     * @type {Map<string,pos2dPair>}
     * 键位类型对应的定位点坐标
     * @default new Map()
     */
    this.keyLocators = new Map();

    /**
     * @type {Array<VariantConfig>}
     * 可用的变体。第一个变体为默认变体，如果只有一个变体，则不会显示变体选择界面
     */
    this.variants = [];

    /**
     * @type {number}
     * 相同按键的最小间隔时间 (ms)
     * @default 0
     */
    this.sameKeyMinInterval = 0;

    /**
     * @type {Array<string>}
     * 包名的一部分
     * @default []
     */
    this.packageNamePart = [];

    /**
     * 
     * @param {{ gameType: string; gameName: string; keyTypes: Array<string>; keyLocators: Map<string,pos2dPair>; variants: Array<VariantConfig>; sameKeyMinInterval: number; packageNamePart: Array<string>; }} json
     */
    this.fromJSON = function (json) {
        this.gameType = json.gameType;
        this.gameName = json.gameName;
        this.keyTypes = json.keyTypes;
        this.keyLocators = json.keyLocators;
        this.variants = json.variants;
        this.sameKeyMinInterval = json.sameKeyMinInterval;
        this.packageNamePart = json.packageNamePart;
    }

    this.toJSON = function () {
        return {
            gameType: this.gameType,
            gameName: this.gameName,
            keyTypes: this.keyTypes,
            keyLocators: this.keyLocators,
            variants: this.variants,
            sameKeyMinInterval: this.sameKeyMinInterval,
            packageNamePart: this.packageNamePart,
        }
    }
    if (json) {
        this.fromJSON(json);
    }
}

let defaultVariantConfig = new VariantConfig({
    variantType: "default",
    variantName: "default",
    availableNoteRange: undefined,
    noteKeyMap: undefined,
    noteDurationImplementionType: NoteDurationImplementionTypes.none,
    sameKeyMinInterval: undefined,
});

const PreDefinedGameConfigs = [
    new GameConfig({
        gameType: "Sky",
        gameName: "Sky",
        keyTypes: ["sky_3x5", "sky_2x4"],
        keyLocators: new Map([
            ["sky_3x5", [[0, 0], [0, 0]]],
            ["sky_2x4", [[0, 0], [0, 0]]],
        ]),
        variants: [
           defaultVariantConfig
        ],
        sameKeyMinInterval: 20,
        packageNamePart: ["sky"],
    }),
    new GameConfig({
        gameType: "Genshin",
        gameName: "Genshin",
        keyTypes: ["generic_3x7"],
        keyLocators: new Map([
            ["generic_3x7", [[0, 0], [0, 0]]],
        ]),
        variants: [
            new VariantConfig({
                variantType: "Windsong Lyre",
                variantName: "Windsong Lyre",
                availableNoteRange: undefined,
                noteKeyMap: undefined,
                noteDurationImplementionType: NoteDurationImplementionTypes.none,
                sameKeyMinInterval: undefined,
            }),
            new VariantConfig({
                variantType: "Vintage Lyre",
                variantName: "Vintage Lyre",
                availableNoteRange: undefined,
                noteKeyMap: noteKeyMaps.genshin_oldsq_3x7,
                noteDurationImplementionType: NoteDurationImplementionTypes.none,
                sameKeyMinInterval: undefined,
            }),
        ],
        sameKeyMinInterval: 20,
        packageNamePart: ["genshin", "yuanshen", "ys.x"],
    }),
    new GameConfig({
        gameType: "Identity V",
        gameName: "Identity V",
        keyTypes: ["generic_3x7"],
        keyLocators: new Map([
            ["generic_3x7", [[0, 0], [0, 0]]],
        ]),
        variants: [
            defaultVariantConfig
        ],
        sameKeyMinInterval: 20,
        packageNamePart: ["dwrg"],
    }),
    new GameConfig({
        gameType: "Customize",
        gameName: "Customize",
        keyTypes: ["diy_3x5"],
        keyLocators: new Map([
            ["diy_3x5", [[0, 0], [0, 0]]],
        ]),
        variants: [
            defaultVariantConfig
        ],
        sameKeyMinInterval: 0,
        packageNamePart: ["easyplay1s"],
    }),
];

/**
 * @constructor
 */
function GameProfile() {

    var preDefinedGameConfigs = PreDefinedGameConfigs;

    /**
     * @type {GameConfig[]}
     */
    var gameConfigs = [];

    /**
     * @type {GameConfig | undefined}
     * 当前生效的游戏配置
     */
    var currentGameConfig = undefined;
    //当前生效的键位布局名
    var currentKeyTypeName = "";
    //当前生效的变体名
    var currentVariantType = "";

    /**
     * @type {Array<pos2d>?}
     * @description 按键位置数组(从下到上, 从左到右)
     */
    var cachedKeyPos = null;

    /**
     * @type {Map<number,number>?}
     * @description midi音高到按键序号(1开始)的映射
     */
    var cachedPitchKeyMap = null;

    /**
     * @type {[number,number]?}
     * @description midi音高范围. 加快查找速度
     */
    var cachedNoteRange = null;

    /**
     * @brief 将当前生效的游戏配置以指定的默认配置覆盖
     * @param {string} name gameType
     * @returns {boolean} 成功返回true, 否则false
     */
    this.resetConfig = function (name) {
        for (let i = 0; i < preDefinedGameConfigs.length; i++) {
            if (preDefinedGameConfigs[i].gameType == name) {
                currentGameConfig = new GameConfig();
                currentGameConfig.fromJSON(preDefinedGameConfigs[i]);
                return true;
            }
        }

        return false;
    }

    /**
     * @brief 加载配置列表
     * @param {Array<Object>} configs 配置列表
     */
    this.loadGameConfigs = function (configs) {
        for (let i = 0; i < configs.length; i++) {
            gameConfigs.push(new GameConfig());
            gameConfigs[i].fromJSON(configs[i]);
        }
    }

    /**
     * @brief 加载默认配置列表
     */
    this.loadDefaultGameConfigs = function () {
        this.loadGameConfigs(preDefinedGameConfigs);
    }

    /**
     * @brief 更新配置列表(当前配置)
     */
    this.updateGameConfigs = function () {
        //将当前配置保存到gameConfigs中
        if (currentGameConfig == null) {
            return;
        }
        let haveCurrentConfig = false;
        for (let i = 0; i < gameConfigs.length; i++) {
            if (gameConfigs[i].gameType == currentGameConfig.gameType) {
                haveCurrentConfig = true;
                gameConfigs[i] = currentGameConfig;
                break;
            }
        }
        if (!haveCurrentConfig) {
            gameConfigs.push(currentGameConfig);
        }
    }

    /**
     * @brief 获取配置列表
     * @returns {GameConfig[]} 配置列表
     */
    this.getGameConfigs = function () {
        this.updateGameConfigs();
        return gameConfigs;
    }

    /**
     * 根据包名设定当前配置
     * @param {string} packageName 包名
     * @returns {boolean} 是否设置成功
     */
    this.setConfigByPackageName = function (packageName) {
        if(packageName == null || packageName == ""){
            return false;
        }
        //首先检查当前配置是否符合要求
        if (currentGameConfig != null) {
            for (let i = 0; i < currentGameConfig.packageNamePart.length; i++) {
                if (packageName.indexOf(currentGameConfig.packageNamePart[i]) != -1) {
                    return true;
                }
            }
        }
        // 检查配置列表中是否有符合要求的配置
        let config = gameConfigs.find(function (config) {
            return config.packageNamePart.some(function (part) {
                return packageName.indexOf(part) != -1;
            });
        });
        if (config == null) {
            return false;
        }
        currentGameConfig = config;
        return true;
    }

    /**
     * 根据配置名(游戏类型)确定当前配置
     * @param {string} gameType 配置文件名
     * @returns {boolean} 是否设置成功
     */
    this.setConfigByName = function (gameType) {
        let config = gameConfigs.find(function (config) {
            return config.gameType == gameType;
        });
        if (config == null) {
            return false;
        }
        currentGameConfig = config;
        return true;
    }

    /**
     * 获取配置文件名的列表
     * @returns {Array<string>} 配置文件名列表
     */
    this.getConfigNameList = function () {
        return gameConfigs.map(function (config) {
            return config.gameType;
        });
    }

    this.getCurrentConfig = function () {
        return currentGameConfig;
    }

    this.getCurrentConfigTypeName = function () {
        if (currentGameConfig == undefined) {
            return
        }
        return currentGameConfig.gameType;
    }

    this.getCurrentConfigDisplayName = function () {
        if (currentGameConfig == undefined) {
            return
        }
        return currentGameConfig.gameName;
    }

    this.setCurrentConfig = function (config) {
        currentGameConfig = config;
    }

    this.getCurrentAvailableVariants = function () {
        if (currentGameConfig == undefined) {
            return undefined;
        }
        return currentGameConfig.variants
    }

    this.getCurrentAvailableKeyLayouts = function () {
        if (currentGameConfig == undefined) {
            return undefined;
        }
        return currentGameConfig.keyTypes;

    }

    this.getAllKeyLayouts = function () {
        return keyLayouts;
    }

    this.setCurrentVariantByTypeName = function (/** @type {string} */ variantType) {
        let variants = this.getCurrentAvailableVariants();
        if (variants == undefined) {
            return false;
        }
        if (variants.find(function (variant) {
            return variant.variantType == variantType;
        }) == undefined) {
            return false;
        }

        currentVariantType = variantType;
    }

    this.getCurrentVariant = function () {
        if (currentGameConfig == undefined) {
            return undefined;
        }
        return currentGameConfig.variants.find(function (variant) {
            return variant.variantType == currentVariantType;
        });
    }

    this.getCurrentVariantTypeName = function () {
        return currentVariantType;
    }

    this.getCurrentVariantDisplayName = function () {
        if (currentGameConfig == undefined) {
            return undefined;
        }
        let variant = this.getCurrentVariant();
        if (variant == undefined) {
            return undefined;
        }
        //如果为唯一的配置，则不显示配置名
        if (currentGameConfig.variants.length == 1) {
            return "";
        }
        return variant.variantName;
    }

    this.setCurrentVariantDefault = function () {
        if (currentGameConfig == undefined) {
            return;
        }
        console.log(JSON.stringify(currentGameConfig));
        currentVariantType = currentGameConfig.variants[0].variantType;
    }

    this.setCurrentKeyLayoutByTypeName = function (/** @type {string} */ keyTypeName) {
        if (currentGameConfig == undefined) {
            return;
        }
        let keyTypes = currentGameConfig.keyTypes;
        if (keyTypes == undefined) {
            return false;
        }
        if (keyTypes.find(function (keyType) {
            return keyType == keyTypeName;
        }) == undefined) {
            return false;
        }
        currentKeyTypeName = keyTypeName;
    }
    this.getCurrentKeyLayout = function () {
        return keyLayouts[currentKeyTypeName];
    }

    this.setCurrentKeyLayoutDefault = function () {
        if (currentGameConfig == undefined) {
            return;
        }
        currentKeyTypeName = currentGameConfig.keyTypes[0];
    }

    this.getCurrentKeyLayoutDisplayName = function () {
        if (currentGameConfig == undefined) {
            return undefined;
        }
        let KeyType = this.getCurrentKeyLayout();
        if (KeyType == undefined) {
            return undefined;
        }
        // //如果为唯一的配置，则不显示配置名
        // if (currentGameConfig.keyTypes.length == 1) {
        //     return "";
        // }
        return KeyType.displayName;
    }

    this.getCurrentKeyLayoutTypeName = function () {
        return currentKeyTypeName;
    }

    this.getProfileIdentifierTriple = function () {
        return `${this.getCurrentConfigTypeName()}-${this.getCurrentKeyLayoutTypeName()}-${this.getCurrentVariantTypeName()}`;
    }

    /**
     * 获取当前按键参数
     * @returns {KeyLayout} 当前按键参数
     */
    this.getKeyLayout = function () {
        return keyLayouts[currentKeyTypeName];
    }

    this.setKeyPosition = function (pos1, pos2) {
        if (currentGameConfig == undefined) {
            return false;
        }
        currentGameConfig.keyLocators[currentKeyTypeName] = [pos1, pos2];
        return true;
    }

    this.checkKeyPosition = function () {
        if (currentGameConfig == undefined) {
            return false;
        }
        if (currentGameConfig.keyLocators[currentKeyTypeName] == undefined) {
            return false;
        }
        let pos = currentGameConfig.keyLocators[currentKeyTypeName];
        if (pos[0][0] == 0 && pos[0][1] == 0 && pos[1][0] == 0 && pos[1][1] == 0) {
            return false;
        }
        return true;
    }

    this.generateKeyPosition = function () {
        if (currentGameConfig == null) {
            return false;
        }
        let currentLayout = keyLayouts[currentKeyTypeName];
        switch (currentLayout.type) {
            case KeyLayoutTypes.grid:{
                let leftTop = 0;
                let rightBottom = 0;
                if (currentLayout.locator == KeyLocatorTypes.left_top_right_bottom) {
                    leftTop = currentGameConfig.keyLocators[currentKeyTypeName][0];
                    rightBottom = currentGameConfig.keyLocators[currentKeyTypeName][1];
                } else {
                    console.log("TODO:unsupported key locator type: " + currentLayout.locator);
                }
                let row = currentLayout.row;
                let col = currentLayout.column;

                let width = rightBottom[0] - leftTop[0];
                let height = rightBottom[1] - leftTop[1];
                //左下角为原点 
                //@ts-ignore
                let keyWidth = width / (col - 1); //@ts-ignore
                let keyHeight = height / (row - 1);
                let keyPos = [];//@ts-ignore
                for (let i = 0; i < row; i++) {//@ts-ignore
                    for (let j = 0; j < col; j++) {
                        let x = leftTop[0] + j * keyWidth;//@ts-ignore
                        let y = leftTop[1] + (row - i - 1) * keyHeight;
                        keyPos.push([Math.round(x), Math.round(y)]);
                    }
                }
                cachedKeyPos = keyPos;
                console.log("generated key position: " + JSON.stringify(keyPos));
                return true;
            }
            case KeyLayoutTypes.arbitrary: {
                let leftTop = 0;
                let rightBottom = 0;
                if (currentLayout.locator == KeyLocatorTypes.left_top_right_bottom) {
                    leftTop = currentGameConfig.keyLocators[currentKeyTypeName][0];
                    rightBottom = currentGameConfig.keyLocators[currentKeyTypeName][1];
                } else {
                    console.log("TODO:unsupported key locator type: " + currentLayout.locator);
                }

                let width = rightBottom[0] - leftTop[0];
                let height = rightBottom[1] - leftTop[1];
                let keyPos = [];
                if(currentLayout.relativeKeyPosition == undefined){
                    console.error("relativeKeyPosition is undefined");
                    return false;
                }
                for (let i = 0; i < currentLayout.relativeKeyPosition.length; i++) {
                    let x = leftTop[0] + currentLayout.relativeKeyPosition[i][0] * width;
                    let y = leftTop[1] + currentLayout.relativeKeyPosition[i][1] * height;
                    keyPos.push([Math.round(x), Math.round(y)]);
                }
                cachedKeyPos = keyPos;
                console.log("generated key position: " + JSON.stringify(keyPos));
                return true;
            }
            case KeyLayoutTypes.nshm_professional:{
                //逆水寒手游的"专业"按键布局
                //这个就很麻烦了...

                //类似于这样的布局
                // x x   x x x   x x   x
                //x x x x x x x x x x x x 
                let leftTopRelativePos = /** @type {[number|null,number]} */ ([null, 0]); //x未知，y为0
                let rightBottomRelativePos =  /** @type {[number|null,number]} */ ([null, 1]); //x未知，y为1
                let keyRelativePoss = new Array();
                let currentVariant = currentGameConfig.variants.find(function (variant) {
                    return variant.variantType == currentVariantType;
                });
                if (currentVariant == undefined) {
                    console.error("currentVariant is undefined");
                    return false;
                }
                let pitchRange = currentVariant.availableNoteRange;
                if (pitchRange == undefined) {
                    console.error("pitchRange is undefined");
                    return false;
                }
                let startPitch = midiPitch.nameToMidiPitch(pitchRange[0]);
                let endPitch = midiPitch.nameToMidiPitch(pitchRange[1]);
                console.log("startPitch: " + startPitch + ", endPitch: " + endPitch);
                let curRelativeX = 0;
                for (let i = startPitch; i <= endPitch; i++) {
                    let curKeyRelativePos;
                    if (midiPitch.isHalf(i)) {
                        curKeyRelativePos = [curRelativeX, 0];
                        curRelativeX += 1 / 2;
                    } else if (i % 12 == 4 || i % 12 == 11) {
                        curKeyRelativePos = [curRelativeX, 1];
                        curRelativeX += 1;
                    } else {
                        curKeyRelativePos = [curRelativeX, 1];
                        curRelativeX += 1/2;
                    }

                    if (curKeyRelativePos[1] == 0) { //上一排
                        if (leftTopRelativePos[0] == null) {
                            leftTopRelativePos[0] = curKeyRelativePos[0]; //第一个
                        }
                    } else {
                        rightBottomRelativePos[0] = curKeyRelativePos[0]; //最后一个
                    }
                    keyRelativePoss.push(curKeyRelativePos.slice());
                }
                console.verbose("keyRelativePoss: " + JSON.stringify(keyRelativePoss));
                console.verbose("leftTopRelativePos: " + JSON.stringify(leftTopRelativePos));
                console.verbose("rightBottomRelativePos: " + JSON.stringify(rightBottomRelativePos));
                if(leftTopRelativePos[0] == null || rightBottomRelativePos[0] == null){
                    console.error("leftTopRelativePos[0] == null || rightBottomRelativePos[0] == null (请将此问题反馈给开发者)");
                    return false;
                }
                let leftTopAbsolutePos = [0, 0];
                let rightBottomAbsolutePos = [0, 0];
                if (currentLayout.locator == KeyLocatorTypes.left_top_right_bottom) {
                    leftTopAbsolutePos = currentGameConfig.keyLocators[currentKeyTypeName][0];
                    rightBottomAbsolutePos = currentGameConfig.keyLocators[currentKeyTypeName][1];
                } else {
                    console.log("TODO:unsupported key locator type: " + currentLayout.locator);
                }
                //坐标变换
                let xScale = (rightBottomAbsolutePos[0] - leftTopAbsolutePos[0]) / (rightBottomRelativePos[0] - leftTopRelativePos[0]);
                let yScale = (rightBottomAbsolutePos[1] - leftTopAbsolutePos[1]) / (rightBottomRelativePos[1] - leftTopRelativePos[1]);
                let xTranslate = leftTopAbsolutePos[0] - leftTopRelativePos[0] * xScale;
                let yTranslate = leftTopAbsolutePos[1] - leftTopRelativePos[1] * yScale;
                let keyAbsolutePoss = keyRelativePoss.map(function (keyRelativePos) {
                    return [keyRelativePos[0] * xScale + xTranslate, keyRelativePos[1] * yScale + yTranslate];
                })
                cachedKeyPos = keyAbsolutePoss;
                console.log("generated key position: " + JSON.stringify(cachedKeyPos));
                return true;
            }
            default:
                console.log("TODO:unknown/unimplemented key layout type: " + currentLayout.type);
                return false;
        }
    }

    /**
     * 获取按键位置
     * @param {number} key 按键序号(从0开始)
     * @returns {[number, number]} 按键位置
     */
    this.getKeyPosition = function (key) {
        if (cachedKeyPos == null) {
            this.generateKeyPosition();
        }
        //@ts-ignore
        return cachedKeyPos[key];
    }

    /**
     * 获取全部按键位置
     * @returns {Array<pos2d>} 按键位置数组
     */
    this.getAllKeyPositions = function () {
        if (cachedKeyPos == null) {
            this.generateKeyPosition();
        }
        //@ts-ignore
        return cachedKeyPos;
    }

    this.generatePitchKeyMap = function () {
        if (currentGameConfig == null) {
            console.log("currentGameConfig is null");
            return new Map();
        }
        let currentVariant = currentGameConfig.variants.find(function (variant) {
            return variant.variantType == currentVariantType;
        });
        let pitchKeyMap = new Map();
        let currentKeyLayoutType = keyLayouts[currentKeyTypeName].type;
        if (currentKeyLayoutType == KeyLayoutTypes.arbitrary ||
            currentKeyLayoutType == KeyLayoutTypes.grid) {
            let keyLayoutAssociatedKeyMap = keyLayouts[currentKeyTypeName].noteKeyMap;
            let variantDefinedKeyMap = currentVariant.noteKeyMap;
            //优先使用variant中定义的按键映射
            let keyMap = variantDefinedKeyMap == undefined ? keyLayoutAssociatedKeyMap : variantDefinedKeyMap;
            if (keyMap == undefined) {
                console.log("keyMap is undefined");
                return new Map();
            }

            let availableNoteRange = currentVariant.availableNoteRange;
            let availableNoteRangeStart = 0;
            let availableNoteRangeEnd = 9999;
            if (availableNoteRange != undefined) {
                availableNoteRangeStart = midiPitch.nameToMidiPitch(availableNoteRange[0]);
                availableNoteRangeEnd = midiPitch.nameToMidiPitch(availableNoteRange[1]);
            }

            let pitchStrs = Object.keys(keyMap);
            console.log("pitchStrs: " + JSON.stringify(pitchStrs));
            for (let i = 0; i < pitchStrs.length; i++) {
                let pitchStr = pitchStrs[i];
                let pitch = midiPitch.nameToMidiPitch(pitchStr);
                if (pitch < availableNoteRangeStart || pitch > availableNoteRangeEnd) {
                    console.log("pitch: " + pitch + " is not in available note range for variant: " + currentVariantType);
                    continue;
                }
                console.log("pitch: " + pitch + " pitchStr: " + pitchStr + " key: " + keyMap[pitchStr]);
                pitchKeyMap.set(pitch, keyMap[pitchStr]);
            }
        } else if (currentKeyLayoutType == KeyLayoutTypes.nshm_professional) {
            //生成按键映射
            let pitchRange = currentVariant.availableNoteRange;
            if (pitchRange == undefined) {
                console.error("pitchRange is undefined");
                return false;
            }
            let startPitch = midiPitch.nameToMidiPitch(pitchRange[0]);
            let endPitch = midiPitch.nameToMidiPitch(pitchRange[1]);
            let cnt = 1;
            for (let i = startPitch; i <= endPitch; i++) {
                let key = cnt;
                pitchKeyMap.set(i, key);
                cnt++;
            }
        } else {
            console.log("TODO:unknown/unimplemented key layout type: " + currentKeyLayoutType);
            return new Map();
        }

        // console.log("generated pitch key map: " + JSON.stringify(pitchKeyMap) + " map:" + pitchKeyMap);
        return pitchKeyMap;
    }

    /**
     * 根据 MIDI 音高值获取对应的按键名。
     * @param {number} pitch - MIDI 音高值。
     * @returns {number} MIDI 音高值对应的按键序号，从0开始，如果没有对应的按键则返回-1。
     */
    this.getKeyByPitch = function (pitch) {
        if (cachedPitchKeyMap == null) {
            cachedPitchKeyMap = this.generatePitchKeyMap();
        }
        let res = cachedPitchKeyMap.get(pitch);
        if (res === undefined) {
            return -1;
        }
        return res - 1;
    }

    /**
     * 获取按键范围。
     * @returns {[number,number]} 按键范围，第一个元素为最小按键序号，第二个元素为最大按键序号。从1开始。
     */
    this.getKeyRange = function () {
        if (cachedPitchKeyMap == null) {
            cachedPitchKeyMap = this.generatePitchKeyMap();
        }
        let keys = Array.from(cachedPitchKeyMap.values());
        let minKey = 999;
        let maxKey = -1;
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (key < minKey) {
                minKey = key;
            }
            if (key > maxKey) {
                maxKey = key;
            }
        }
        return [minKey, maxKey];
    }

    this.getNoteRange = function () {
        if (cachedNoteRange == null) {
            if (cachedPitchKeyMap == null) {
                cachedPitchKeyMap = this.generatePitchKeyMap();
            }
            let pitches = Array.from(cachedPitchKeyMap.keys());
            let minPitch = 999;
            let maxPitch = -1;
            for (let i = 0; i < pitches.length; i++) {
                let pitch = pitches[i];
                if (pitch < minPitch) {
                    minPitch = pitch;
                }
                if (pitch > maxPitch) {
                    maxPitch = pitch;
                }
            }
            cachedNoteRange = [minPitch, maxPitch];
        }
        return cachedNoteRange;
    }

    this.getSameKeyMinInterval = function () {
        if (currentGameConfig == undefined) {
            console.log("currentGameConfig is undefined");
            return undefined;
        }
        let currentVariant = currentGameConfig.variants[currentVariantType];
        if (currentVariant != undefined && currentVariant.sameKeyMinInterval != undefined) {
            return currentVariant.sameKeyMinInterval;
        }
        return currentGameConfig.sameKeyMinInterval;
    }

    /**
     * 获取物理上和指定按键距离靠近的按键
     * @param {number} key 指定按键
     * @returns {Array<[key: number, distance: number]>}  距离指定按键较近的按键序号和距离
     */
    this.getPhysicalClosestKeys = function (key) {
        if (cachedKeyPos == null) {
            this.generateKeyPosition();
        }
        let keyPos = cachedKeyPos[key];
        let closestKeys = [];
        for (let i = 0; i < cachedKeyPos.length; i++) {
            if (i == key) {
                continue;
            }
            let pos = cachedKeyPos[i];
            let distance = Math.sqrt(Math.pow(pos[0] - keyPos[0], 2) + Math.pow(pos[1] - keyPos[1], 2));
            closestKeys.push([i, distance]);
        }
        closestKeys.sort(function (a, b) {
            return a[1] - b[1];
        });
        return closestKeys;
    }

    /**
     * 获取物理上的按键最小距离
     * @returns {number} 物理上的按键最小距离(像素)
     */
    this.getPhysicalMinKeyDistance = function () {
        if (cachedKeyPos == null) {
            this.generateKeyPosition();
        }
        let minDistance = 999999;
        for (let i = 0; i < cachedKeyPos.length; i++) {
            for (let j = i + 1; j < cachedKeyPos.length; j++) {
                let distance = Math.sqrt(Math.pow(cachedKeyPos[i][0] - cachedKeyPos[j][0], 2) + Math.pow(cachedKeyPos[i][1] - cachedKeyPos[j][1], 2));
                if (distance < minDistance) {
                    minDistance = distance;
                }
            }
        }
        return minDistance;
    }

    /**
     * 清除当前配置的缓存
     */
    this.clearCurrentConfigCache = function () {
        cachedKeyPos = null;
        cachedPitchKeyMap = null;
        cachedNoteRange = null;
    }

    /**
     * 获取当前游戏与乐曲调式相关的提示信息
     * @param {string} key 调号
     * @returns {string} 提示信息
     * @see MidiPitch.getTranspositionEstimatedKey
     */
    this.getGameSpecificHintByEstimatedKey = function (key) {
        if (currentGameConfig == undefined) {
            return "";
        }
        if (currentGameConfig.gameType === "光遇") {
            return `光遇: 建议演奏位置: ${skyTuneMapPosition[key]}`;
        }
        return "";
    }
}

console.info("GameProfile.js loaded");

module.exports = GameProfile;
