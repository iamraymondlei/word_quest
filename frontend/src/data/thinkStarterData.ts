export interface ThinkVocabItem {
  en: string;
  zh: string;
  icon?: string;
  category?: string;
  antonym?: string;
  extra?: string;
}

export interface ThinkVocabSection {
  title: string;
  subtitle?: string;
  layout?: 'grid' | 'pairs' | 'tags' | 'antonyms';
  items: ThinkVocabItem[];
}

export interface ThinkGrammarTable {
  headers: string[];
  rows: string[][];
}

export interface ThinkGrammarPoint {
  title: string;
  ruleSummary?: string;
  table?: ThinkGrammarTable;
  examples?: Array<{ en: string; zh: string }>;
  notes?: string[];
}

export interface ThinkDialogueItem {
  speaker?: string;
  en: string;
  zh: string;
  responseEn?: string;
  responseZh?: string;
}

export interface ThinkCultureCard {
  title: string;
  country: string;
  flag?: string;
  details: string[];
}

export interface ThinkWritingBranch {
  label: string;
  icon?: string;
  templates: Array<{ en: string; zh?: string }>;
}

export interface ThinkWritingGuide {
  title: string;
  topic: string;
  branches: ThinkWritingBranch[];
}

export interface ThinkUnitData {
  id: number;
  unit: string;
  title: string;
  themeColor: string; // Tailwind color name like 'cyan', 'purple', 'emerald', 'amber', 'indigo'
  subtitle: string;
  vocabularySections: ThinkVocabSection[];
  grammarPoints: ThinkGrammarPoint[];
  speakingDialogues: Array<{
    title: string;
    items: ThinkDialogueItem[];
  }>;
  cultureSection?: {
    title: string;
    cards: ThinkCultureCard[];
  };
  writingGuide: ThinkWritingGuide;
}

export const THINK_STARTER_UNITS: ThinkUnitData[] = [
  // ================= UNIT 1 =================
  {
    id: 1,
    unit: 'Unit 1',
    title: 'ALL TOGETHER',
    subtitle: '国家、国籍、性格形容词与 be 动词基础',
    themeColor: 'cyan',
    vocabularySections: [
      {
        title: 'Vocabulary 1: Countries & Nationalities (国家与国籍)',
        subtitle: '掌握 12 个重点国家名称及对应的人/语言/形容词',
        layout: 'pairs',
        items: [
          { en: 'Brazil', zh: '巴西', icon: '🇧🇷', extra: 'Brazilian (巴西人；巴西的)' },
          { en: 'the UK', zh: '英国', icon: '🇬🇧', extra: 'British (英国人；英国的)' },
          { en: 'the USA', zh: '美国', icon: '🇺🇸', extra: 'American (美国人；美国的)' },
          { en: 'Turkey', zh: '土耳其', icon: '🇹🇷', extra: 'Turkish (土耳其人；土耳其的)' },
          { en: 'Japan', zh: '日本', icon: '🇯🇵', extra: 'Japanese (日本人；日本的；日语)' },
          { en: 'Mexico', zh: '墨西哥', icon: '🇲🇽', extra: 'Mexican (墨西哥人；墨西哥的)' },
          { en: 'Russia', zh: '俄罗斯', icon: '🇷🇺', extra: 'Russian (俄罗斯人；俄罗斯的；俄语)' },
          { en: 'Sudan', zh: '苏丹', icon: '🇸🇩', extra: 'Sudanese (苏丹人；苏丹的)' },
          { en: 'Ecuador', zh: '厄瓜多尔', icon: '🇪🇨', extra: 'Ecuadorian (厄瓜多尔人；厄瓜多尔的)' },
          { en: 'Indonesia', zh: '印度尼西亚', icon: '🇮🇩', extra: 'Indonesian (印度尼西亚人；印尼语)' },
          { en: 'South Africa', zh: '南非', icon: '🇿🇦', extra: 'South African (南非人；南非的)' },
          { en: 'Spain', zh: '西班牙', icon: '🇪🇸', extra: 'Spanish (西班牙人；西班牙语)' },
        ],
      },
      {
        title: 'Vocabulary 2: Opposite Adjectives (反义形容词对)',
        subtitle: '成对对比记忆常见核心形容词',
        layout: 'antonyms',
        items: [
          { en: 'clean', zh: '干净的', icon: '✨', antonym: 'dirty (脏的)' },
          { en: 'fast', zh: '快的', icon: '⚡', antonym: 'slow (慢的)' },
          { en: 'new', zh: '新的', icon: '🆕', antonym: 'old (旧的)' },
          { en: 'big', zh: '大的', icon: '🐘', antonym: 'small (小的)' },
          { en: 'expensive', zh: '昂贵的', icon: '💎', antonym: 'cheap (便宜的)' },
        ],
      },
    ],
    grammarPoints: [
      {
        title: 'Grammar 1: Question Words (特殊疑问词用法)',
        ruleSummary: '英语中由 wh- 或 h- 开头的提问词，用来询问不同类型的信息。',
        table: {
          headers: ['疑问词', '含义', '提问对象', '典型例句'],
          rows: [
            ['Who', '谁', '问人', 'Who is she? —— She is my mother.'],
            ['What', '什么', '问事物', "What's this? —— It's a pencil."],
            ['When', '何时', '问时间', 'When do you go to school? —— At 7:00.'],
            ['Where', '哪里', '问地点', "Where is my bag? —— It's under the book."],
            ['Why', '为什么', '问原因', 'Why do you like summer? —— Because I can go swimming.'],
            ['How', '怎么样', '问方式/状态', 'How do you go to school? —— By bus.'],
          ],
        },
      },
      {
        title: 'Grammar 2: The Verb "to be" (be 动词的现在时人称缩写)',
        ruleSummary: '我用 am，你用 are，is 连着他她它；复数人称全用 are。',
        table: {
          headers: ['代词', 'be动词', '缩写形式', '例句示范'],
          rows: [
            ['I', 'am', "I'm", "I'm a student. (我是学生。)"],
            ['You (单数)', 'are', "You're", "You're beautiful. (你很漂亮。)"],
            ['She', 'is', "She's", "She's my sister. (她是我的妹妹。)"],
            ['He', 'is', "He's", "He's a boy. (他是一个男孩。)"],
            ['It', 'is', "It's", "It's a cat. (它是一只小猫。)"],
            ['You (复数)', 'are', "You're", "You're all students. (你们都是学生。)"],
            ['We', 'are', "We're", "We're at home. (我们在家里。)"],
            ['They', 'are', "They're", "They're happy. (他们很开心。)"],
          ],
        },
      },
    ],
    speakingDialogues: [
      {
        title: 'Reading & Functions: Getting to know someone (结识新朋友)',
        items: [
          { en: "What's your name?", zh: '你叫什么名字？', responseEn: "My name is... / I'm...", responseZh: '我的名字是…… / 我是……' },
          { en: 'Where are you from?', zh: '你来自哪里？', responseEn: "I'm from...", responseZh: '我来自……' },
          { en: 'Nice to meet you.', zh: '见到你很高兴。', responseEn: 'Nice to meet you, too.', responseZh: '见到你也很高兴。' },
          { en: 'I need to go now.', zh: '我现在该走了。', responseEn: 'Bye.', responseZh: '再见。' },
        ],
      },
      {
        title: 'Developing Speaking: Talking about yourself and others (谈论自己与他人)',
        items: [
          { en: 'How is it going?', zh: '最近怎么样？', responseEn: 'Great!', responseZh: '非常棒！' },
          { en: "Who's that / she?", zh: '那/她是谁？', responseEn: "That's...", responseZh: '那是……' },
          { en: 'See you later.', zh: '回头见。', responseEn: 'Goodbye.', responseZh: '再见。' },
          { en: "I'm not sure.", zh: '我不确定。' },
          { en: "That's awesome.", zh: '太棒了！' },
          { en: 'Is there a problem?', zh: '有什么问题吗？' },
        ],
      },
    ],
    writingGuide: {
      title: 'Writing Mind Map: Personal Information (个人信息介绍思维导图)',
      topic: 'About Me (关于我)',
      branches: [
        {
          label: 'Name (姓名)',
          icon: '🏷️',
          templates: [
            { en: 'My name is [Name].', zh: '我的名字是……' },
            { en: "I'm [Name].", zh: '我是……' },
          ],
        },
        {
          label: 'Age (年龄)',
          icon: '🎂',
          templates: [
            { en: "I'm [Age] years old.", zh: '我……岁了。' },
            { en: "I'm [Age].", zh: '我……岁。' },
          ],
        },
        {
          label: 'City / Country (城市与国家)',
          icon: '🌍',
          templates: [
            { en: 'I come from [Country].', zh: '我来自……' },
            { en: "I'm from a city called [City].", zh: '我来自一座名叫……的城市。' },
          ],
        },
        {
          label: 'Favourite Things (最喜欢的事物)',
          icon: '⭐',
          templates: [
            { en: 'My favourite singer/athlete/actor is [Name]. He/She is awesome!', zh: '我最喜欢的歌手/运动员/演员是……，他/她超棒！' },
            { en: 'My favourite music is [pop / rap / R&B / classical / country].', zh: '我最喜欢的音乐是……' },
          ],
        },
      ],
    },
  },

  // ================= UNIT 2 =================
  {
    id: 2,
    unit: 'Unit 2',
    title: "I'M EXCITED",
    subtitle: '情绪感受、评价形容词、be 动词疑问句与人称代词宾格',
    themeColor: 'purple',
    vocabularySections: [
      {
        title: 'Vocabulary 1: Adjectives to Describe Feelings (感觉与情绪形容词)',
        subtitle: '表达喜怒哀乐与身体感受的核心词汇',
        layout: 'grid',
        items: [
          { en: 'angry', zh: '生气的', icon: '😡' },
          { en: 'cold', zh: '冷的', icon: '🥶' },
          { en: 'bored', zh: '无聊的', icon: '🥱' },
          { en: 'excited', zh: '兴奋的', icon: '🤩' },
          { en: 'hot', zh: '热的', icon: '🥵' },
          { en: 'hungry', zh: '饥饿的', icon: '🤤' },
          { en: 'thirsty', zh: '口渴的', icon: '🥤' },
          { en: 'worried', zh: '担忧的', icon: '😟' },
          { en: 'tired', zh: '疲惫的', icon: '😴' },
          { en: 'sad', zh: '伤心的', icon: '😢' },
        ],
      },
      {
        title: 'Vocabulary 2: Positive & Negative Adjectives (积极与消极评价)',
        subtitle: '用于评价事物和体验的褒义与贬义形容词',
        layout: 'pairs',
        items: [
          { en: 'positive', zh: '积极的', icon: '🌈', extra: 'Positive' },
          { en: 'funny', zh: '有趣的 / 搞笑的', icon: '🤡', extra: 'Positive' },
          { en: 'good', zh: '好的', icon: '👍', extra: 'Positive' },
          { en: 'great', zh: '伟大的 / 极好的', icon: '🌟', extra: 'Positive' },
          { en: 'excellent', zh: '优秀的 / 卓越的', icon: '💯', extra: 'Positive' },
          { en: 'exciting', zh: '令人兴奋的', icon: '🎢', extra: 'Positive' },
          { en: 'negative', zh: '消极的 / 负面的', icon: '🌧️', extra: 'Negative' },
          { en: 'awful', zh: '糟糕透顶的', icon: '💥', extra: 'Negative' },
          { en: 'bad', zh: '坏的 / 不好的', icon: '👎', extra: 'Negative' },
          { en: 'terrible', zh: '可怕的 / 极差的', icon: '😱', extra: 'Negative' },
        ],
      },
    ],
    grammarPoints: [
      {
        title: 'Grammar 1: Questions and Short Answers (be 动词疑问句与简略回答)',
        ruleSummary: '将 be 动词（Am, Is, Are）提前至主语前构成一般疑问句。肯定回答不缩写，否定回答通常缩写。',
        table: {
          headers: ['主语', '否定句完整式', '否定缩写', '一般疑问句', '肯定简短回答', '否定简短回答'],
          rows: [
            ['I', 'I am not...', 'I am not...', 'Am I...?', 'Yes, I am.', "No, I'm not."],
            ['we', 'We are not...', "We aren't...", 'Are we...?', 'Yes, we are.', "No, we aren't."],
            ['you', 'You are not...', "You aren't...", 'Are you...?', 'Yes, you are.', "No, you aren't."],
            ['he/she/it', 'He/She/It is not...', "He/She/It isn't...", 'Is he/she/it...?', 'Yes, he/she/it is.', "No, he/she/it isn't."],
            ['they', 'They are not...', "They aren't...", 'Are they...?', 'Yes, they are.', "No, they aren't."],
          ],
        },
      },
      {
        title: 'Grammar 2: Object Pronouns (人称代词宾格对照表)',
        ruleSummary: '动词或介词后的人称代词必须使用宾格形式（作动作的承受者）。',
        table: {
          headers: ['Subject (主格)', '中文翻译', 'Object (宾格)', '例句示范'],
          rows: [
            ['I', '我', 'me', 'Listen to me. (听我说。)'],
            ['You', '你', 'you', 'I like you. (我喜欢你。)'],
            ['She', '她', 'her', 'Look at her. (看看她。)'],
            ['He', '他', 'him', 'Call him later. (待会打给他。)'],
            ['It', '它', 'it', 'I love it! (我喜欢它！)'],
            ['We', '我们', 'us', 'Join us for lunch. (加入我们一起吃午餐。)'],
            ['You', '你们', 'you', 'I see you all. (我看到你们所有人了。)'],
            ['They', '他们', 'them', 'Help them please. (请帮助他们。)'],
          ],
        },
      },
    ],
    speakingDialogues: [
      {
        title: 'Reading & Functions: Expressing Likes & Dislikes (表达喜好与厌恶)',
        items: [
          { en: 'Do you like Little Mix?', zh: '你喜欢 Little Mix 吗？', responseEn: "Yes, I like her. She's great.", responseZh: '是的，我喜欢她。她很棒。' },
          { en: 'Do you like Dua Lipa?', zh: '你喜欢 Dua Lipa 吗？', responseEn: "No, I don't like them. They are terrible.", responseZh: '不，我不喜欢他们。他们很差劲。' },
        ],
      },
    ],
    cultureSection: {
      title: 'Culture: Masks Around the World (世界各地的面具文化)',
      cards: [
        {
          title: 'Day of the Dead Mask (亡灵节面具)',
          country: 'Mexico (墨西哥)',
          flag: '🇲🇽',
          details: ['Remember family members and friends who are not alive.', 'Colorful skulls and celebration of memories.'],
        },
        {
          title: 'Lion Dance Mask (舞狮面具)',
          country: 'China (中国)',
          flag: '🇨🇳',
          details: ['The mask is on the head of one dancer; it is magnificent and beautiful.', 'Brings good luck and ward off evil.'],
        },
        {
          title: 'Carnival Mask (狂欢节面具)',
          country: 'Italy (意大利 / 威尼斯)',
          flag: '🇮🇹',
          details: ['An important, historical part of the Venice carnival.', 'Intricate decorations with feathers and gold paint.'],
        },
        {
          title: 'Medicine Man Mask (巫医面具)',
          country: 'North America (北美)',
          flag: '🇨🇦',
          details: ['Originated from the First Nations indigenous people in Canada.', 'Used in traditional spiritual healing ceremonies.'],
        },
        {
          title: 'Halloween Mask (万圣节面具)',
          country: 'Many Countries (多国文化)',
          flag: '🎃',
          details: ['Celebrated on 31st October every year.', 'Children wear masks and ask for sweets: "Trick or treat!"'],
        },
      ],
    },
    writingGuide: {
      title: 'Writing Mind Map: Describing Feelings & Things (情绪与感受短消息写作框架)',
      topic: 'Messages About Feeling (感受短消息)',
      branches: [
        {
          label: 'Start (开头)',
          icon: '👋',
          templates: [
            { en: 'Greeting: Hi / Hello, [NAME]', zh: '问候语：嗨/你好，某某' },
            { en: "Where are you?: I'm in/on/at [Place]...", zh: '所在地点：我在……' },
          ],
        },
        {
          label: 'Body (正文)',
          icon: '💭',
          templates: [
            { en: "How do you feel?: I'm [excited / tired / bored]...", zh: '你的感受：我感到……' },
            { en: 'Why? / Why not?: Because [Reason]...', zh: '原因说明：因为……' },
          ],
        },
        {
          label: 'Finish (结尾)',
          icon: '💌',
          templates: [
            { en: 'Care about the recipient: How are you? / Hope you are well.', zh: '关怀对方：你最近怎么样？/ 祝好。' },
          ],
        },
      ],
    },
  },

  // ================= UNIT 3 =================
  {
    id: 3,
    unit: 'Unit 3',
    title: 'FAMILY TIME',
    subtitle: '家庭成员、房屋空间、家具、名词所有格与物主代词',
    themeColor: 'emerald',
    vocabularySections: [
      {
        title: 'Vocabulary 1: Family Members (家庭成员家谱)',
        subtitle: '涵盖直系与旁系核心亲属关系',
        layout: 'grid',
        items: [
          { en: 'grandfather', zh: '祖父 / 外祖父', icon: '👴' },
          { en: 'grandmother', zh: '祖母 / 外祖母', icon: '👵' },
          { en: 'father', zh: '爸爸', icon: '👨' },
          { en: 'mother', zh: '妈妈', icon: '👩' },
          { en: 'uncle', zh: '伯父 / 叔叔 / 舅舅', icon: '🧔' },
          { en: 'aunt', zh: '伯母 / 婶婶 / 姑姑 / 阿姨', icon: '👩‍🦰' },
          { en: 'brother', zh: '哥哥 / 弟弟', icon: '👦' },
          { en: 'sister', zh: '姐姐 / 妹妹', icon: '👧' },
          { en: 'cousin', zh: '堂（表）兄弟 / 姐妹', icon: '🧒' },
          { en: 'husband', zh: '丈夫', icon: '💍' },
          { en: 'wife', zh: '妻子', icon: '💐' },
          { en: 'son', zh: '儿子', icon: '👶' },
          { en: 'daughter', zh: '女儿', icon: '🎀' },
        ],
      },
      {
        title: 'Vocabulary 2: House & Rooms (房屋格局空间)',
        subtitle: '家的各个区域与空间布局',
        layout: 'grid',
        items: [
          { en: 'living room', zh: '客厅', icon: '🛋️' },
          { en: 'bedroom', zh: '卧室', icon: '🛏️' },
          { en: 'kitchen', zh: '厨房', icon: '🍳' },
          { en: 'bathroom', zh: '浴室', icon: '🚿' },
          { en: 'garage', zh: '车库', icon: '🚗' },
          { en: 'hall', zh: '走廊 / 过道', icon: '🚪' },
          { en: 'garden', zh: '花园 / 院子', icon: '🌻' },
        ],
      },
      {
        title: 'Vocabulary 3: Furniture (常见家具设施)',
        subtitle: '生活起居常备家具与洁具设施',
        layout: 'grid',
        items: [
          { en: 'bed', zh: '床', icon: '🛏️' },
          { en: 'armchair', zh: '单人扶手椅', icon: '🪑' },
          { en: 'sofa', zh: '沙发', icon: '🛋️' },
          { en: 'cooker', zh: '厨灶 / 炉灶', icon: '🍳' },
          { en: 'toilet', zh: '马桶 / 卫生间', icon: '🚽' },
          { en: 'shower', zh: '花洒 / 淋浴器', icon: '🚿' },
          { en: 'bath', zh: '浴缸', icon: '🛁' },
          { en: 'fridge', zh: '冰箱', icon: '🧊' },
        ],
      },
    ],
    grammarPoints: [
      {
        title: "Grammar 1: Possessive 's (名词所有格表示所属关系)",
        ruleSummary: "表示“某人的……”：单数加 's，以 s 结尾的复数只加 '。",
        table: {
          headers: ['单词形式', '构成规则', '经典例句示范'],
          rows: [
            ['单数名词', "词尾加 's", "It is my brother's book. (这是我弟弟的书。)"],
            ['不以 s 结尾的复数名词', "词尾加 's", "Today is Children's Day. (今天是六一儿童节。)"],
            ['以 s 结尾的复数名词', "词尾直接加 '", "She is the two girls' mother. (她是那两个女孩的妈妈。)"],
            ['以 s 结尾的复数名词', "词尾直接加 '", "This is the dogs' home. (这是小狗们的家。)"],
          ],
        },
      },
      {
        title: 'Grammar 2: Possessive Adjectives (形容词性物主代词)',
        ruleSummary: '放在名词前面，修饰名词说明归属，相当于“谁的”。',
        table: {
          headers: ['主格代词', '物主代词', '中文含义', '例句示范'],
          rows: [
            ['I', 'my', '我的', 'My book is on the table.'],
            ['you (单数)', 'your', '你的', 'Your pencil is very nice.'],
            ['she', 'her', '她的', 'Her bag is pink.'],
            ['he', 'his', '他的', 'He loves his toy car.'],
            ['it', 'its', '它的', 'The cat is eating its fish.'],
            ['we', 'our', '我们的', 'Our classroom is clean.'],
            ['you (复数)', 'your', '你们的', 'Mrs Li is your teacher.'],
            ['they', 'their', '他们的', 'They are playing with their children.'],
          ],
        },
      },
      {
        title: 'Grammar 3: Demonstrative Pronouns (指示代词 this / that / these / those)',
        ruleSummary: 'this (近单) 对应 these (近复)；that (远单) 对应 those (远复)。',
        table: {
          headers: ['指示代词', '单复数分类', '空间距离', '例句示范'],
          rows: [
            ['this', 'Singular (单数)', '近处 (离得近)', 'I want this book. (我想要这本书。)'],
            ['that', 'Singular (单数)', '远处 (离得远)', 'I want that book. (我想要那本书。)'],
            ['these', 'Plural (复数)', '近处 (离得近)', 'I want these books. (我想要这些书。)'],
            ['those', 'Plural (复数)', '远处 (离得远)', 'I want those books. (我想要那些书。)'],
          ],
        },
      },
    ],
    speakingDialogues: [
      {
        title: "Reading & Functions: Visiting Someone's Room (参观朋友房间)",
        items: [
          { en: 'Is this your...?', zh: '这是你的……吗？', responseEn: "Yes, it is. / No, it isn't.", responseZh: '是的。/ 不是。' },
          { en: 'Do you like it?', zh: '你喜欢它吗？', responseEn: 'Yes, I love it.', responseZh: '是的，我很喜欢它。' },
          { en: "Come on, let's go.", zh: '来吧，我们走吧。', responseEn: 'Just a minute.', responseZh: '请稍等片刻。' },
          { en: 'That is a nice photograph.', zh: '多漂亮的一张照片啊！' },
          { en: "Who is that next to you?", zh: '站在你旁边的那位是谁？', responseEn: "That is my cousin.", responseZh: '那是我的堂弟。' },
        ],
      },
      {
        title: 'Developing Speaking: Paying Compliments (夸赞与赞赏他人)',
        items: [
          { en: 'This is / These are great / cool / awesome.', zh: '这/这些很棒/很酷/太棒了！' },
          { en: 'She / He / It looks beautiful / cool / great.', zh: '她/他/它看起来很漂亮/很酷/很棒。' },
          { en: 'What a cool picture!', zh: '多酷的照片啊！', responseEn: 'Thank you.', responseZh: '谢谢你。' },
          { en: 'I really like your bedroom.', zh: '我很喜欢你的卧室。' },
          { en: 'That sounds fantastic!', zh: '听起来太神奇美妙了！' },
        ],
      },
    ],
    writingGuide: {
      title: 'Writing Mind Map: My Favourite Room (最喜爱的房间思维导图)',
      topic: 'My Favourite Room (我最喜爱的房间)',
      branches: [
        {
          label: 'Which Room (具体房间)',
          icon: '🏠',
          templates: [
            { en: 'My favourite room is the [bedroom / living room / kitchen].', zh: '我最喜欢的房间是……' },
          ],
        },
        {
          label: 'Size (房间大小)',
          icon: '📐',
          templates: [
            { en: 'The room is big / small.', zh: '这个房间挺大/挺小巧。' },
            { en: 'It is a big / small room with a lot of light.', zh: '这是一间采光很好的大/小房间。' },
          ],
        },
        {
          label: 'Furniture & Things (房间内物品)',
          icon: '🛋️',
          templates: [
            { en: 'There is a [bed / desk / sofa] in the room.', zh: '房间里有一张……' },
            { en: 'There are some [books / pictures / toys] in the room.', zh: '房间里有一些……' },
          ],
        },
        {
          label: 'Description (颜色与感受)',
          icon: '🎨',
          templates: [
            { en: 'The colour of the walls is [pink / blue / white].', zh: '墙壁的颜色是……' },
            { en: 'It is very comfortable, cool and quiet.', zh: '它非常舒适、酷且安静。' },
          ],
        },
      ],
    },
  },

  // ================= UNIT 4 =================
  {
    id: 4,
    unit: 'Unit 4',
    title: 'CITY LIFE',
    subtitle: '城市场所、方位介词、数字百千读法、价格表达与 There be 句型',
    themeColor: 'amber',
    vocabularySections: [
      {
        title: 'Vocabulary 1: Places in a Town / City (公共城市场所)',
        subtitle: '日常城镇生活经常涉足的设施机构',
        layout: 'grid',
        items: [
          { en: 'museum', zh: '博物馆', icon: '🏛️' },
          { en: 'restaurant', zh: '餐厅 / 餐馆', icon: '🍽️' },
          { en: 'park', zh: '公园', icon: '🌳' },
          { en: 'bank', zh: '银行', icon: '🏦' },
          { en: 'supermarket', zh: '超市', icon: '🛒' },
          { en: 'chemist', zh: '药店 / 药房', icon: '💊' },
          { en: 'post office', zh: '邮局', icon: '📮' },
          { en: 'library', zh: '图书馆', icon: '📚' },
          { en: 'train station', zh: '火车站', icon: '🚆' },
        ],
      },
      {
        title: 'Vocabulary 2: Prepositions of Place (空间方位介词)',
        subtitle: '准确描述建筑与物体相对空间位置',
        layout: 'grid',
        items: [
          { en: 'in front of', zh: '在……前面', icon: '⏩' },
          { en: 'behind', zh: '在……后面', icon: '⏪' },
          { en: 'between', zh: '在……之间 (两者之间)', icon: '↔️' },
          { en: 'opposite', zh: '在……正对面', icon: '🔁' },
          { en: 'next to', zh: '在……紧挨着旁边', icon: '👉' },
          { en: 'on the corner of', zh: '在……的拐角/街角处', icon: '📍' },
        ],
      },
      {
        title: 'Vocabulary 3: Numbers 100+ (大数字百千位数读法)',
        subtitle: '掌握英文大数字拼读与规律',
        layout: 'pairs',
        items: [
          { en: '130', zh: '一百三十', extra: 'one hundred and thirty' },
          { en: '150', zh: '一百五十', extra: 'one hundred and fifty' },
          { en: '175', zh: '一百七十五', extra: 'one hundred and seventy-five' },
          { en: '200', zh: '二百', extra: 'two hundred' },
          { en: '560', zh: '五百六十', extra: 'five hundred and sixty' },
          { en: '1,000', zh: '一千', extra: 'one thousand' },
          { en: '1,200', zh: '一千二百', extra: 'one thousand two hundred' },
          { en: '2,000', zh: '二千', extra: 'two thousand' },
        ],
      },
      {
        title: 'Vocabulary 4: Prices & Currencies (货币符号与价格读法)',
        subtitle: '英美与欧洲主流货币标价朗读规则',
        layout: 'pairs',
        items: [
          { en: '$ dollar (美元)', zh: '例如 $21.95', extra: 'twenty-one dollars (and) ninety-five (cents)' },
          { en: '£ pound (英镑)', zh: '例如 £2.50', extra: 'two pounds fifty' },
          { en: '€ euro (欧元)', zh: '例如 €230', extra: 'two hundred and thirty euros' },
        ],
      },
    ],
    grammarPoints: [
      {
        title: 'Grammar 1: There be Structure (There be 存在句型)',
        ruleSummary: '表示“某处存在有某人或某物”，be 动词单复数由其后紧跟的主语决定（就近原则）。',
        table: {
          headers: ['句式类型', 'Singular (单数名词)', 'Plural (复数名词)'],
          rows: [
            ['肯定句', 'There is a bank near here.', 'There are some museums.'],
            ['否定句', "There isn't a library.", "There aren't any parks."],
            ['一般疑问句', 'Is there a chemist nearby?', 'Are there any good shops?'],
          ],
        },
        notes: [
          'some 和 any：some 常用于肯定句（如 There are some interesting things in the museum）；any 常用于否定句和疑问句（如 Are there any parks?）。',
        ],
      },
      {
        title: 'Grammar 2: Imperatives (祈使句指令与指示路线)',
        ruleSummary: '用于发布命令、要求、警告或给指引路线。',
        table: {
          headers: ['类型', '语法构成', '例句示范'],
          rows: [
            ['肯定祈使句', '实义动词原形 + 其他', 'Turn right at the supermarket. (在超市右转。)'],
            ['肯定祈使句', '实义动词原形 + 其他', 'Go straight on High Street. (在商业街直行。)'],
            ['否定祈使句', "Don't + 动词原形 + 其他", "Don't be late for school! (上学不要迟到！)"],
            ['否定祈使句', "Don't + 动词原形 + 其他", "Don't run in the corridor. (不要在走廊奔跑。)"],
          ],
        },
      },
    ],
    speakingDialogues: [
      {
        title: 'Reading & Functions: Giving Directions (指路问路场景)',
        items: [
          { en: "Turn right and right again into High Street. Turn right into King Street. It's on the right.", zh: '右转，再右转进入商业街。然后右转进入国王街。它就在右手边。' },
          { en: 'The supermarket?', zh: '是超市吗？', responseEn: "That's right!", responseZh: '完全正确！' },
        ],
      },
      {
        title: 'Reading & Functions: Buying in a Shop (商店购物常用情境对话)',
        items: [
          { en: 'Can I help you?', zh: '我能帮你吗？ / 想看点什么？' },
          { en: "I'll take them.", zh: '我要买它们了。' },
          { en: 'How much are they?', zh: '它们一共多少钱？' },
          { en: "Here's your change.", zh: '这是找给你的零钱。' },
          { en: "That's £5.20, please.", zh: '一共是 5.2 英镑，谢谢。' },
          { en: 'Have you got any postcards?', zh: '你们这里有明信片吗？' },
        ],
      },
    ],
    cultureSection: {
      title: 'Culture: Parks around the World (世界名园巡礼)',
      cards: [
        {
          title: 'Villa Borghese (博尔盖塞公园)',
          country: 'Rome, Italy (意大利罗马)',
          flag: '🇮🇹',
          details: ['A very big public park.', 'Contains beautiful gardens, trees, fountains, and famous museums.'],
        },
        {
          title: 'Golden Gate Park (金门公园)',
          country: 'San Francisco, US (美国旧金山)',
          flag: '🇺🇸',
          details: ['Huge park (4.8km long, almost 1km wide).', 'At one end of the park you can see the ocean sea.'],
        },
        {
          title: 'Chapultepec Park (查普尔特佩克公园)',
          country: 'Mexico City, Mexico (墨西哥城)',
          flag: '🇲🇽',
          details: ['Important urban green space.', 'Features a lake and a hill with an ancient castle; beloved by local families.'],
        },
        {
          title: 'El Parque del Buen Retiro (丽池公园)',
          country: 'Madrid, Spain (西班牙马德里)',
          flag: '🇪🇸',
          details: ['Very big park with walking paths and trees.', 'Features a lovely rose garden and an iconic glass palace.'],
        },
        {
          title: 'The Iguana Park (Parque Seminario 鬣蜥公园)',
          country: 'Guayaquil, Ecuador (厄瓜多尔瓜亚基尔)',
          flag: '🇪🇨',
          details: ['Known locally as Parque Seminario.', 'Full of friendly iguanas roaming around; visitors go and feed them fruit.'],
        },
        {
          title: 'Mount Faber Park (花柏山公园)',
          country: 'Singapore (新加坡)',
          flag: '🇸🇬',
          details: ['Located on a mountain scenic ridge.', 'Accessible by cable car, with high canopy bridges and city panoramic views.'],
        },
      ],
    },
    writingGuide: {
      title: 'Writing Mind Map: Guide to My City / Town (城市导览框架)',
      topic: 'My Town / City (我的城镇)',
      branches: [
        {
          label: 'Places (设施景点)',
          icon: '🏙️',
          templates: [
            { en: 'In my town, there is a big [park / museum / library].', zh: '在我的镇上，有一个大……' },
            { en: 'There are many [restaurants / shops / cafes].', zh: '这里有许多……' },
          ],
        },
        {
          label: 'Location (位置分布)',
          icon: '📍',
          templates: [
            { en: 'The library is opposite the train station.', zh: '图书馆就在火车站正对面。' },
            { en: 'The supermarket is next to the post office.', zh: '超市挨着邮局。' },
          ],
        },
      ],
    },
  },

  // ================= UNIT 5 =================
  {
    id: 5,
    unit: 'Unit 5',
    title: 'FREE TIME',
    subtitle: '课余兴趣爱好、数码酷玩、星期、一般现在时（肯/否/问）与频率副词',
    themeColor: 'indigo',
    vocabularySections: [
      {
        title: 'Vocabulary 1: Free-time Activities (休闲娱乐活动)',
        subtitle: '课余充实生活的常见活动词组',
        layout: 'grid',
        items: [
          { en: 'build robots', zh: '制作机器人', icon: '🤖' },
          { en: 'listen to music', zh: '听音乐', icon: '🎧' },
          { en: 'play sport', zh: '进行体育锻炼', icon: '⚽' },
          { en: 'play computer games', zh: '玩电脑游戏', icon: '🎮' },
          { en: 'go shopping', zh: '去逛街购物', icon: '🛍️' },
          { en: 'do homework', zh: '做作业', icon: '✏️' },
          { en: 'chat to friends online', zh: '和朋友网上聊天', icon: '💬' },
          { en: 'dance', zh: '跳舞', icon: '💃' },
          { en: 'hang out with friends', zh: '和朋友结伴出去玩', icon: '🛹' },
        ],
      },
      {
        title: 'Vocabulary 2: Gadgets (数码智能设备)',
        subtitle: '现代儿童常用的电子科技小设备',
        layout: 'grid',
        items: [
          { en: 'e-reader', zh: '电子阅读器 (如Kindle)', icon: '📖' },
          { en: 'games console', zh: '游戏机 (如Switch/PS5)', icon: '🕹️' },
          { en: 'GPS', zh: '全球卫星定位导航仪', icon: '🧭' },
          { en: 'headphones', zh: '头戴式耳机', icon: '🎧' },
          { en: 'laptop', zh: '笔记本电脑', icon: '💻' },
          { en: 'smartphone', zh: '智能手机', icon: '📱' },
          { en: 'tablet', zh: '平板电脑 (如iPad)', icon: '📱' },
          { en: 'VR headset', zh: '虚拟现实头戴显示器', icon: '🥽' },
        ],
      },
      {
        title: 'Vocabulary 3: Days of the Week (一星期的七天)',
        subtitle: '英文星期首字母务必大写，常与介词 on 连用',
        layout: 'tags',
        items: [
          { en: 'Monday', zh: '星期一 (周一)', icon: '1️⃣' },
          { en: 'Tuesday', zh: '星期二 (周二)', icon: '2️⃣' },
          { en: 'Wednesday', zh: '星期三 (周三)', icon: '3️⃣' },
          { en: 'Thursday', zh: '星期四 (周四)', icon: '4️⃣' },
          { en: 'Friday', zh: '星期五 (周五)', icon: '5️⃣' },
          { en: 'Saturday', zh: '星期六 (周末)', icon: '6️⃣' },
          { en: 'Sunday', zh: '星期日 (周末)', icon: '7️⃣' },
        ],
      },
    ],
    grammarPoints: [
      {
        title: 'Grammar 1: Present Simple - Affirmative (一般现在时肯定句与三单变化)',
        ruleSummary: '陈述经常性、习惯性的动作。主语为第三人称单数（He/She/It）时，动词需发生三单变形。',
        table: {
          headers: ['主语人称', '动词类型', '词尾变化规律', '典型例句示范'],
          rows: [
            ['第三人称单数 (He/She/It)', '一般动词', '加 -s', 'It rains a lot in the rainy season.'],
            ['第三人称单数 (He/She/It)', '辅音字母 + y 结尾', '去 -y，加 -ies', 'She studies hard every day.'],
            ['第三人称单数 (He/She/It)', '元音字母 + y 结尾', '直接加 -s', 'He often says hello to me.'],
            ['第三人称单数 (He/She/It)', '-ch / -sh / -s / -ss / -o / -x 结尾', '加 -es', 'He always watches TV in the evening.'],
            ['其他人称 (I/You/We/They)', '所有动词', '保留动词原形', 'I go to school by bus every day.'],
            ['其他人称 (I/You/We/They)', '所有动词', '保留动词原形', 'We love to climb the mountains on holidays.'],
          ],
        },
      },
      {
        title: 'Grammar 2: Adverbs of Frequency (频率副词与位置规律)',
        ruleSummary: '表示事情发生的频率高低。位置口诀：在 be 动词之后，在行为动词（实义动词）之前。',
        table: {
          headers: ['频率百分比', '频率副词', '中文含义', '例句示范 (注意位置)'],
          rows: [
            ['100%', 'always', '总是 / 始终', 'She always finishes her homework on time.'],
            ['70%~80%', 'often', '经常 / 常常', 'I am often late for school because of traffic. (在be后)'],
            ['40%~50%', 'sometimes', '有时 / 偶尔', 'He sometimes forgets to bring his lunch. (在实义动词前)'],
            ['0%', 'never', '从不 / 绝不', 'She is never rude to anyone. (在be后)'],
          ],
        },
      },
      {
        title: 'Grammar 3: Present Simple - Negative (一般现在时否定句)',
        ruleSummary: "三单否定用 doesn't + 动词原形；其他人称否定用 don't + 动词原形。",
        table: {
          headers: ['主语人称', '肯定句形式', '否定结构', '否定句示范 (注意动词还原)'],
          rows: [
            ['第三人称单数 (He/She/It)', 'She likes playing tennis.', "主语 + doesn't + 动词原形", "She doesn't like playing tennis."],
            ['第三人称单数 (He/She/It)', 'He plays games.', "主语 + doesn't + 动词原形", "He doesn't play games on weekdays."],
            ['其他人称 (I/You/We/They)', 'They play football.', "主语 + don't + 动词原形", "They don't play football on weekends."],
            ['其他人称 (I/You/We/They)', 'We have a car.', "主语 + don't + 动词原形", "We don't have a car."],
          ],
        },
      },
      {
        title: 'Grammar 4: Present Simple - Questions (一般现在时一般疑问句与简略回答)',
        ruleSummary: '三单句首借助 Does；其他人称句首借助 Do。实义动词必须恢复原形！',
        table: {
          headers: ['主语人称', '一般疑问句结构', '肯定回答', '否定回答', '例句'],
          rows: [
            ['第三人称单数 (He/She/It)', 'Does + 主语 + 动词原形 + 其他?', 'Yes, he/she/it does.', "No, he/she/it doesn't.", 'Does she often go shopping? —— Yes, she does.'],
            ['其他人称 (I/You/We/They)', 'Do + 主语 + 动词原形 + 其他?', 'Yes, I/you/we/they do.', "No, I/you/we/they don't.", 'Do they have lunch at school? —— No, they don\'t.'],
          ],
        },
      },
    ],
    speakingDialogues: [
      {
        title: 'Reading & Functions: Talking about Hobbies & Routines (谈论日常兴趣与习惯)',
        items: [
          { en: 'What do you do in your free time?', zh: '你空闲时间都做些什么？', responseEn: 'I usually listen to music and build robots.', responseZh: '我通常听听音乐，做做机器人。' },
          { en: 'Do you play games on weekdays?', zh: '你工作日玩游戏吗？', responseEn: "No, I don't. I only play on Saturdays.", responseZh: '不，我不玩。我只在周六玩。' },
        ],
      },
    ],
    writingGuide: {
      title: 'Writing Mind Map: My Weekend & Free Time (我的周末与课余时光)',
      topic: 'My Free Time (我的课余时光)',
      branches: [
        {
          label: 'Activities (常规活动)',
          icon: '⚽',
          templates: [
            { en: 'On Saturday mornings, I always [play sport / do my homework].', zh: '在周六上午，我总是……' },
            { en: 'In the afternoon, I often hang out with my best friends.', zh: '下午我经常和最好的朋友出去玩。' },
          ],
        },
        {
          label: 'Gadgets I Use (我使用的科技设备)',
          icon: '📱',
          templates: [
            { en: 'I use my [tablet / laptop] to chat with friends online.', zh: '我用我的平板/电脑和朋友网上聊天。' },
            { en: 'I like reading stories on my e-reader before going to bed.', zh: '我喜欢睡前在电子书阅读器上看故事。' },
          ],
        },
      ],
    },
  },
  // ================= UNIT 6 =================
  {
    id: 6,
    unit: 'Unit 6',
    title: 'BEST FRIENDS',
    subtitle: '身体五官部位、外貌特征描摹、have/has got 用法、可数与不可数名词及友谊互助',
    themeColor: 'rose',
    vocabularySections: [
      {
        title: 'Vocabulary 1: Parts of the Body (身体与五官部位)',
        subtitle: '掌握 10 个常见面部五官与身体肢体核心词汇',
        layout: 'grid',
        items: [
          { en: 'nose', zh: '鼻子', icon: '👃' },
          { en: 'ear', zh: '耳朵', icon: '👂' },
          { en: 'eye', zh: '眼睛', icon: '👁️' },
          { en: 'face', zh: '脸 / 面部', icon: '👧' },
          { en: 'mouth', zh: '嘴巴', icon: '👄' },
          { en: 'arm', zh: '手臂', icon: '💪' },
          { en: 'hand', zh: '手', icon: '✋' },
          { en: 'body', zh: '身体', icon: '🧍' },
          { en: 'leg', zh: '腿', icon: '🦵' },
          { en: 'foot', zh: '脚 (复数: feet)', icon: '🦶', extra: '复数不规则变化为 feet' },
        ],
      },
      {
        title: 'Vocabulary 2: Facial Features & Accessories (面部外貌特征与配饰)',
        subtitle: '描摹人物长相、胡须特征与配饰标志',
        layout: 'grid',
        items: [
          { en: 'glasses', zh: '眼镜 (常作复数)', icon: '👓', extra: 'wear glasses 戴眼镜' },
          { en: 'moustache', zh: '八字胡 / 唇上胡子', icon: '🥸', extra: '长在嘴唇上方的胡须' },
          { en: 'beard', zh: '络腮胡 / 下巴胡子', icon: '🧔', extra: '长在下巴或两腮的胡须' },
          { en: 'smile', zh: '微笑 / 笑容', icon: '😊', extra: 'have a warm smile 面带微笑' },
          { en: 'earring', zh: '耳环 / 耳饰', icon: '💍', extra: 'wear earrings 戴耳环' },
        ],
      },
      {
        title: 'Vocabulary 3: Hair Styles & Appearance Colors (发型发色与五官色彩)',
        subtitle: '发型曲直长短与常见特征颜色搭配',
        layout: 'pairs',
        items: [
          { en: 'straight hair', zh: '直发', icon: '💇', extra: 'straight 直的' },
          { en: 'wavy hair', zh: '波浪卷发', icon: '🌊', extra: 'wavy 波浪状的' },
          { en: 'curly hair', zh: '卷发', icon: '🌀', extra: 'curly 卷曲的' },
          { en: 'long hair', zh: '长发', icon: '📏', extra: 'long 长的' },
          { en: 'short hair', zh: '短发', icon: '✂️', extra: 'short 短的' },
          { en: 'blonde', zh: '金色的 / 金发', icon: '👱', extra: 'blonde hair 金黄色头发' },
          { en: 'brown', zh: '棕色的 / 褐色', icon: '🟤', extra: 'brown eyes/hair 棕色' },
          { en: 'black', zh: '黑色的', icon: '⚫', extra: 'black hair 黑色头发' },
          { en: 'grey', zh: '灰色的 / 白发', icon: '⚪', extra: 'grey hair 灰白头发' },
          { en: 'red', zh: '红色的 / 红发', icon: '🔴', extra: 'red hair 姜红发色' },
          { en: 'blue', zh: '蓝色的 (蓝眼睛)', icon: '🔵', extra: 'blue eyes 蓝眼睛' },
          { en: 'green', zh: '绿色的 (绿眼睛)', icon: '🟢', extra: 'green eyes 绿眼睛' },
        ],
      },
      {
        title: 'Vocabulary 4: Height & Dimension Opposites (身材与长短反义词对)',
        subtitle: '成对对比掌握高矮与长短',
        layout: 'antonyms',
        items: [
          { en: 'tall', zh: '高的', icon: '🦒', antonym: 'short (矮的)' },
          { en: 'long', zh: '长的', icon: '📏', antonym: 'short (短的)' },
        ],
      },
    ],
    grammarPoints: [
      {
        title: 'Grammar 1: have / has got (表示“拥有”或“具有某种特征”)',
        ruleSummary: 'have got / has got 专门用于表示某人拥有某物或具备某种外貌特征（如发色、眼睛颜色等）。主语为第三人称单数 (he/she/it) 时用 has got；其他人称用 have got。',
        table: {
          headers: ['主语人称', '肯定形式 (Positive)', '否定形式 (Negative)', '例句示范'],
          rows: [
            ['I', "have got ('ve got)", "have not got (haven't got)", "I've got brown eyes. (我有棕色的眼睛。)"],
            ['You', "have got ('ve got)", "have not got (haven't got)", "You've got a nice smile. (你笑容很灿烂。)"],
            ['We', "have got ('ve got)", "have not got (haven't got)", "We haven't got glasses. (我们没戴眼镜。)"],
            ['They', "have got ('ve got)", "have not got (haven't got)", "They've got dark hair. (他们有一头黑发。)"],
            ['He', "has got ('s got)", "has not got (hasn't got)", "He's got a beard and moustache. (他留着胡子。)"],
            ['She', "has got ('s got)", "has not got (hasn't got)", "She hasn't got curly hair. (她不是卷发。)"],
            ['It', "has got ('s got)", "has not got (hasn't got)", "It's got big ears. (它有一对大耳朵。)"],
          ],
        },
        notes: [
          "肯定句缩写：I have got = I've got；He has got = He's got；She has got = She's got",
          "否定句结构：主语 + haven't got / hasn't got + 宾语，not 置于 have/has 之后",
          "注意与 there is/are 区分：have got 强调归属主体（人/动物），there be 强调某处存在某物",
        ],
      },
      {
        title: 'Grammar 2: have / has got - Questions & Answers (一般疑问句与简略回答)',
        ruleSummary: "把 Have / Has 提到主语前构成疑问句，got 仍放在主语之后。简略回答中只保留 have/haven't 或 has/hasn't，不再带 got！",
        table: {
          headers: ['疑问句结构', '肯定简答 (Yes)', '否定简答 (No)', '典型问答例句'],
          rows: [
            ['Have + I / you / we / they + got...?', 'Yes, I/you/we/they have.', "No, I/you/we/they haven't.", "Have you got blue eyes? —— Yes, I have. / No, I haven't."],
            ['Has + he / she / it + got...?', 'Yes, he/she/it has.', "No, he/she/it hasn't.", "Has she got wavy hair? —— Yes, she has. / No, she hasn't."],
            ['Has he got earrings?', 'Yes, he has.', "No, he hasn't.", "Has he got a moustache? —— No, he hasn't."],
          ],
        },
        notes: [
          "口诀：简答不带 got！例：Yes, I have. (不可写成 Yes, I have got.)",
          "注意三单转换：主语是单个人名时用 Has，如 Has Tom got curly hair?",
        ],
      },
      {
        title: 'Grammar 3: Countable and Uncountable Nouns (可数与不可数名词及 some / any 用法)',
        ruleSummary: '可数名词能数出具体数量，有单复数之分；不可数名词无法具体计数（如时间、水等），只有单数形式。修饰两者复数/量时，肯定句通常用 some，否定句和疑问句通常用 any。',
        table: {
          headers: ['名词分类', '概念与形式规律', '限定词搭配规则', '典型例句示范'],
          rows: [
            ['可数名词单数 (Singular)', '具体单个个体，有单数形式', '单数前用 a / an', 'She has got an earring and a blue bag.'],
            ['可数名词复数 (Plural)', '两个及以上个体，词尾通常 +s / -es', 'two, three... 或 some / any', 'They have got three pencils and some books.'],
            ['不可数名词 (Uncountable)', '无法具体计数的事物 (如 time, milk, hair)', '不能加 a/an，没有复数形式', 'We have got some time before class.'],
            ['肯定句用法 (some)', '修饰可数名词复数或不可数名词', '肯定句中表示“一些”', "I've got some good friends at school."],
            ['否定句用法 (any)', '修饰可数名词复数或不可数名词', '否定句中表示“任何/一点也没有”', "He hasn't got any brothers or sisters."],
            ['疑问句用法 (any)', '修饰可数名词复数或不可数名词', '一般疑问句中表示“有没有一些”', 'Have you got any pets at home?'],
          ],
        },
        notes: [
          "a 用于辅音音素开头的单数名词前 (a nose, a boy)；an 用于元音音素开头的单数名词前 (an eye, an ear, an apple)",
          "有些词汇在英语中视作不可数名词，如 time (时间)、information (信息)、water (水)、bread (面包)",
          "头发 hair 作整体头发时常用作不可数名词 (He has got short hair.)，单根头发时才可数 (a white hair)",
        ],
      },
    ],
    speakingDialogues: [
      {
        title: 'Reading & Functions: Describing People (询问与描述人物外貌与性格)',
        items: [
          { en: 'What does he look like?', zh: '他长什么样？(问外貌)', responseEn: "He is tall and he's got short curly brown hair.", responseZh: '他个子很高，留着棕色卷短发。' },
          { en: 'What does she look like?', zh: '她长什么样？(问外貌)', responseEn: "She's got long straight blonde hair and blue eyes.", responseZh: '她有一头金黄色的直长发和蓝眼睛。' },
          { en: 'What is this new teacher like?', zh: '这位新老师人怎么样？(问性格)', responseEn: 'She is very friendly, kind and clever.', responseZh: '她非常亲切友好，热心且聪慧。' },
          { en: 'What are they like?', zh: '他们性格为人怎么样？(问性格)', responseEn: 'They are very active and helpful.', responseZh: '他们非常活跃而且乐于助人。' },
          { en: 'Are they Chinese?', zh: '他们是中国人吗？', responseEn: 'Yes, they are.', responseZh: '是的，他们是。' },
          { en: 'Are they foolish?', zh: '他们愚蠢吗？', responseEn: "No, they aren't. They are brilliant.", responseZh: '不，他们不蠢，他们非常出色。' },
          { en: 'Is he French?', zh: '他是法国人吗？', responseEn: 'Yes, he is.', responseZh: '是的，他是。' },
          { en: 'Is it Paul?', zh: '那是保罗吗？', responseEn: "No, it isn't. That is Simon.", responseZh: '不，不是他。那是西蒙。' },
        ],
      },
      {
        title: 'Think Value: Helping a Friend (关怀身边的朋友：情境与互助行动)',
        items: [
          { en: 'My friend is sad.', zh: '我的朋友很难过、伤心。', responseEn: 'I give him/her a warm hug.', responseZh: '我给他/她一个温暖的拥抱。' },
          { en: 'My friend gets a bad mark in his/her History test.', zh: '我的朋友历史测验考砸了。', responseEn: 'I help him/her study and review together.', responseZh: '我帮他/她一起复习功课。' },
          { en: 'My friend is hungry and has nothing to eat.', zh: '我的朋友肚子饿了却没有食物。', responseEn: 'I make him/her a delicious sandwich.', responseZh: '我给他/她做一份美味的三明治。' },
          { en: "My friend's computer is broken.", zh: '我朋友的电脑坏了。', responseEn: 'I lend him/her my tablet.', responseZh: '我把我的平板电脑借给他/她用。' },
        ],
      },
    ],
    cultureSection: {
      title: 'Culture: Welcome People Around the World (世界各地的礼节与问候文化)',
      cards: [
        {
          title: 'Bowing (点头鞠躬礼)',
          country: 'Asian Countries (亚洲多国)',
          flag: '🇯🇵',
          details: [
            'In many countries in Asia, people bow their heads when they greet each other.',
            'Bowing shows politeness, respect, and humility.',
          ],
        },
        {
          title: 'Hongi (毛利碰鼻礼)',
          country: 'New Zealand (新西兰)',
          flag: '🇳🇿',
          details: [
            'The Maori people in New Zealand rub noses together when they meet.',
            'It represents sharing the breath of life ("ha") together.',
          ],
        },
        {
          title: 'Namaste (合十礼)',
          country: 'India, Nepal & Bangladesh (南亚国家)',
          flag: '🇮🇳',
          details: [
            'People bring their hands together in front of their heart and say "Namaste".',
            'It means "I bow to the divine in you" as a sign of deep respect.',
          ],
        },
        {
          title: 'Handshake (经典握手礼)',
          country: 'Western Countries (西方国家)',
          flag: '🇬🇧',
          details: [
            'Many people shake hands firmly when they meet in everyday or business life.',
            'It is a universal gesture of friendship and trust.',
          ],
        },
        {
          title: 'Hand on Heart (手抚心口点头礼)',
          country: 'Malaysia (马来西亚)',
          flag: '🇲🇾',
          details: [
            'You put your right hand on your heart and gently nod your head.',
            'It conveys heartfelt sincerity, warmth, and respect.',
          ],
        },
        {
          title: 'Fist Bump (碰拳礼)',
          country: 'The United States (美国)',
          flag: '🇺🇸',
          details: [
            'Some people bump their fists together to greet friends casually.',
            'Very popular among young people and sports teammates.',
          ],
        },
        {
          title: 'Hand Kissing to Forehead (吻手贴额礼)',
          country: 'Turkey & Philippines (土耳其与菲律宾)',
          flag: '🇹🇷',
          details: [
            'You kiss the right hand of elders and place it on your forehead.',
            'A beautiful traditional way to show respect to grandparents and elders.',
          ],
        },
        {
          title: 'Cheek Kiss (亲吻面颊礼 / 贴面礼)',
          country: 'France, Spain & Latin America (多国)',
          flag: '🇫🇷',
          details: [
            'Friends kiss each other gently on one or both cheeks ("la bise").',
            'A warm and customary greeting among close friends and family members.',
          ],
        },
      ],
    },
    writingGuide: {
      title: 'Writing Mind Map: Describing a Best Friend (描述我最好的朋友)',
      topic: 'My Best Friend (我的好朋友)',
      branches: [
        {
          label: 'Appearance: Height & Hair (身高身材与发型)',
          icon: '💇',
          templates: [
            { en: 'My best friend is [tall / short / of medium height].', zh: '我最好的朋友个子[高 / 矮 / 中等身高]。' },
            { en: 'He / She has got [long curly brown / short straight black] hair.', zh: '他/她留着[长棕色卷发 / 短黑色直发]。' },
          ],
        },
        {
          label: 'Appearance: Face, Eyes & Accessories (五官神态与配饰)',
          icon: '👓',
          templates: [
            { en: 'He / She has got big [blue / brown / green] eyes and a sweet smile.', zh: '他/她长着大大的[蓝色/棕色/绿色]眼睛，面带甜美的微笑。' },
            { en: 'He / She wears [stylish glasses / shiny earrings].', zh: '他/她戴着[时尚的眼镜 / 闪亮的耳环]。' },
          ],
        },
        {
          label: 'Personality & Qualities (性格为人与闪光品质)',
          icon: '🌟',
          templates: [
            { en: 'He / She is very [friendly / clever / kind / active].', zh: '他/她性格非常[友好 / 聪明 / 善良 / 活跃]。' },
            { en: 'He / She is always ready to help me when I am in trouble.', zh: '每当我遇到困难时，他/她总是乐于帮助我。' },
          ],
        },
        {
          label: 'Likes & Dislikes (兴趣爱好与课余日常)',
          icon: '⚽',
          templates: [
            { en: 'In his / her free time, he / she likes [playing football / reading / swimming].', zh: '在空闲时间，他/她喜欢[踢足球 / 阅读 / 游泳]。' },
            { en: "He / She doesn't like [getting up early on cold mornings].", zh: '他/她不喜欢[在寒冷的早晨早起]。' },
          ],
        },
      ],
    },
  },
];
