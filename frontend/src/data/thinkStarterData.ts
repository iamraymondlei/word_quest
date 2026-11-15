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
  // ================= UNIT 7 =================
  {
    id: 7,
    unit: 'Unit 7',
    title: 'LIVING FOR SPORT',
    subtitle: '体育运动项目与动词搭配、时间的英式表达法、月份与季节、序数词规律口诀、情态动词 can 表达能力、时间介词 in/on/at',
    themeColor: 'teal',
    vocabularySections: [
      {
        title: 'Vocabulary 1: Sports & Activities (体育运动项目与搭配)',
        subtitle: '掌握 8 个核心体育项目与高频动作搭配 (cycle / dive / ski / skateboard / play ... / do ...)',
        layout: 'grid',
        items: [
          { en: 'cycle', zh: '骑车 / 骑自行车', icon: '🚴', extra: '动词，也可表示骑行运动 (go cycling)' },
          { en: 'dive', zh: '潜水 / 跳水', icon: '🤿', extra: '潜入水中或高台跳水' },
          { en: 'ski', zh: '滑雪', icon: '⛷️', extra: '动词，也可作名词 (go skiing)' },
          { en: 'skateboard', zh: '玩滑板 / 滑板', icon: '🛹', extra: '动词或名词 (go skateboarding)' },
          { en: 'play basketball', zh: '打篮球', icon: '🏀', extra: 'play + 球类运动 (不加 the)' },
          { en: 'play volleyball', zh: '打排球', icon: '🏐', extra: 'play + 球类运动' },
          { en: 'do gymnastics', zh: '做体操', icon: '🤸', extra: 'do + 健身/体操/竞技类项目' },
          { en: 'do Taekwondo', zh: '打跆拳道', icon: '🥋', extra: 'do + 武术/搏击类项目' },
          { en: 'swim', zh: '游泳', icon: '🏊', extra: '动词 (go swimming 去游泳)' },
          { en: 'ride a bike', zh: '骑自行车', icon: '🚲', extra: '动词短语 (骑单车)' },
          { en: 'play football', zh: '踢足球', icon: '⚽', extra: 'play + 球类运动' },
          { en: 'play tennis', zh: '打网球', icon: '🎾', extra: 'play + 球类运动' },
        ],
      },
      {
        title: 'Vocabulary 2: Telling the Time (时间的英式表达法)',
        subtitle: "掌握 o'clock (整点)、past (几点过几分)、to (差几分到几点)、half past 与 quarter",
        layout: 'pairs',
        items: [
          { en: "two o'clock", zh: '两点整 (2:00)', icon: '🕑', extra: "It's two o'clock." },
          { en: 'five past two', zh: '两点过五分 (2:05)', icon: '🕑', extra: "It's five past two." },
          { en: 'ten past two', zh: '两点过十分 (2:10)', icon: '🕑', extra: "It's ten past two." },
          { en: 'quarter past two', zh: '两点一刻 / 两点十五分 (2:15)', icon: '🕑', extra: "It's quarter past two." },
          { en: 'twenty past two', zh: '两点过二十分 (2:20)', icon: '🕑', extra: "It's twenty past two." },
          { en: 'twenty-five past two', zh: '两点过二十五分 (2:25)', icon: '🕑', extra: "It's twenty-five past two." },
          { en: 'half past two', zh: '两点半 (2:30)', icon: '🕝', extra: "It's half past two." },
          { en: 'twenty-five to three', zh: '两点三十五分 / 差二十五分到三点 (2:35)', icon: '🕝', extra: "It's twenty-five to three." },
          { en: 'twenty to three', zh: '两点四十分 / 差二十分到三点 (2:40)', icon: '🕝', extra: "It's twenty to three." },
          { en: 'quarter to three', zh: '两点四十五分 / 差一刻到三点 (2:45)', icon: '🕒', extra: "It's quarter to three." },
          { en: 'ten to three', zh: '两点五十分 / 差十分到三点 (2:50)', icon: '🕒', extra: "It's ten to three." },
          { en: 'five to three', zh: '两点五十五分 / 差五分到三点 (2:55)', icon: '🕒', extra: "It's five to three." },
        ],
      },
      {
        title: 'Vocabulary 3: Months and Seasons (一年四季与十二月份)',
        subtitle: '掌握四季归属与 12 个月份的英式拼写及缩写',
        layout: 'pairs',
        items: [
          { en: 'winter', zh: '冬天 / 冬季', icon: '❄️', extra: '包含 December, January, February' },
          { en: 'spring', zh: '春天 / 春季', icon: '🌱', extra: '包含 March, April, May' },
          { en: 'summer', zh: '夏天 / 夏季', icon: '☀️', extra: '包含 June, July, August' },
          { en: 'autumn', zh: '秋天 / 秋季', icon: '🍂', extra: '包含 September, October, November' },
          { en: 'January', zh: '一月 (Jan.)', icon: '❄️', extra: '冬季月份，公历新年的第一个月' },
          { en: 'February', zh: '二月 (Feb.)', icon: '⛄', extra: '冬季月份，平年 28 天，闰年 29 天' },
          { en: 'March', zh: '三月 (Mar.)', icon: '🌱', extra: '春季开始的月份' },
          { en: 'April', zh: '四月 (Apr.)', icon: '🌧️', extra: '春暖花开，春雨时节' },
          { en: 'May', zh: '五月 (May)', icon: '🌸', extra: '初夏前夕，繁花盛开' },
          { en: 'June', zh: '六月 (Jun.)', icon: '☀️', extra: '夏季开始的月份' },
          { en: 'July', zh: '七月 (Jul.)', icon: '🏖️', extra: '盛夏时节，暑假开始' },
          { en: 'August', zh: '八月 (Aug.)', icon: '🍉', extra: '盛夏度假月' },
          { en: 'September', zh: '九月 (Sep.)', icon: '🎒', extra: '秋季开始，金秋开学季' },
          { en: 'October', zh: '十月 (Oct.)', icon: '🎃', extra: '金秋十月' },
          { en: 'November', zh: '十一月 (Nov.)', icon: '🍁', extra: '深秋时节' },
          { en: 'December', zh: '十二月 (Dec.)', icon: '🎄', extra: '冬季月份，岁末年终' },
        ],
      },
      {
        title: 'Vocabulary 4: Ordinal Numbers (序数词与规律口诀)',
        subtitle: '表示顺序的词：一二三单独记，8去t，9去e，ve变f替，整十y变ie加th，超过21个位变身',
        layout: 'grid',
        items: [
          { en: 'first', zh: '第一 (1st)', icon: '🥇', extra: 'one 对应序数词' },
          { en: 'second', zh: '第二 (2nd)', icon: '🥈', extra: 'two 对应序数词' },
          { en: 'third', zh: '第三 (3rd)', icon: '🥉', extra: 'three 对应序数词' },
          { en: 'fourth', zh: '第四 (4th)', icon: '4️⃣', extra: 'four + th' },
          { en: 'fifth', zh: '第五 (5th)', icon: '5️⃣', extra: 'five 变 ve 为 f 加 th' },
          { en: 'sixth', zh: '第六 (6th)', icon: '6️⃣', extra: 'six + th' },
          { en: 'seventh', zh: '第七 (7th)', icon: '7️⃣', extra: 'seven + th' },
          { en: 'eighth', zh: '第八 (8th)', icon: '8️⃣', extra: 'eight 去 t 加 th' },
          { en: 'ninth', zh: '第九 (9th)', icon: '9️⃣', extra: 'nine 去 e 加 th' },
          { en: 'tenth', zh: '第十 (10th)', icon: '🔟', extra: 'ten + th' },
          { en: 'eleventh', zh: '第十一 (11th)', icon: '🔢', extra: 'eleven + th' },
          { en: 'twelfth', zh: '第十二 (12th)', icon: '🔢', extra: 'twelve 变 ve 为 f 加 th' },
          { en: 'thirteenth', zh: '第十三 (13th)', icon: '🔢', extra: 'thirteen + th' },
          { en: 'twentieth', zh: '第二十 (20th)', icon: '🔢', extra: 'twenty 变 y 为 ie 加 th' },
          { en: 'twenty-first', zh: '第二十一 (21st)', icon: '🔢', extra: '超过21序数词，个位变身' },
          { en: 'twenty-second', zh: '第二十二 (22nd)', icon: '🔢', extra: 'twenty- + second' },
          { en: 'twenty-third', zh: '第二十三 (23rd)', icon: '🔢', extra: 'twenty- + third' },
          { en: 'thirtieth', zh: '第三十 (30th)', icon: '🔢', extra: 'thirty 变 y 为 ie 加 th' },
          { en: 'thirty-fifth', zh: '第三十五 (35th)', icon: '🔢', extra: 'thirty- + fifth' },
          { en: 'fortieth', zh: '第四十 (40th)', icon: '🔢', extra: 'forty 变 y 为 ie 加 th' },
          { en: 'fiftieth', zh: '第五十 (50th)', icon: '🔢', extra: 'fifty 变 y 为 ie 加 th' },
          { en: 'sixtieth', zh: '第六十 (60th)', icon: '🔢', extra: 'sixty 变 y 为 ie 加 th' },
          { en: 'seventieth', zh: '第七十 (70th)', icon: '🔢', extra: 'seventy 变 y 为 ie 加 th' },
          { en: 'eightieth', zh: '第八十 (80th)', icon: '🔢', extra: 'eighty 变 y 为 ie 加 th' },
          { en: 'ninetieth', zh: '第九十 (90th)', icon: '🔢', extra: 'ninety 变 y 为 ie 加 th' },
          { en: 'one hundredth', zh: '第一百 (100th)', icon: '💯', extra: 'hundred + th' },
        ],
      },
    ],
    grammarPoints: [
      {
        title: 'Grammar 1: Modal Verb "can" for Ability (情态动词 can 表达能力与客观可能)',
        ruleSummary: "can 表示体力或脑力方面的“能力”或客观上的“可能”。句型结构为：主语 + can + 动词原形。can 没有任何人称和数的变化（第三人称单数同样用 can，绝不可加 -s）；否定句在 can 后面直接加 not 变为 can't 或 cannot；一般疑问句将 can 提前到句首：Can + 主语 + 动词原形？肯定回答用 Yes, 主语 + can.，否定回答用 No, 主语 + can't.",
        table: {
          headers: ['句型分类', '主语人称', '结构与例句 (English)', '中文释义'],
          rows: [
            ['肯定句 (Positive)', '第一人称 (I / We)', 'We can sing. / I can cycle.', '我们会唱歌。/ 我会骑车。'],
            ['肯定句 (Positive)', '第二人称 (You)', 'You can dive very well.', '你潜水潜得非常好。'],
            ['肯定句 (Positive)', '第三人称 (He / She / It)', 'He can swim. / She can ski.', '他会游泳。/ 她会滑雪。'],
            ['肯定句 (Positive)', '复数人称 (They)', 'They can play basketball.', '他们会打篮球。'],
            ['否定句 (Negative)', '所有人称通用', "He can't swim. / They cannot skateboard.", '他不会游泳。/ 他们不会玩滑板。'],
            ['一般疑问句 (Question)', '第二人称 (You)', 'Can you ride a bike?', '你会骑自行车吗？'],
            ['肯定回答 (Short +)', '第一人称 (I / We)', 'Yes, I can. / Yes, we can.', '是的，我会。/ 是的，我们会。'],
            ['否定回答 (Short -)', '第一人称 (I / We)', "No, I can't. / No, we can't.", '不，我不会。/ 不，我们不会。'],
            ['一般疑问句 (Question)', '第三人称 (He / She)', 'Can he play volleyball?', '他会打排球吗？'],
            ['肯定回答 (Short +)', '第三人称 (He / She)', 'Yes, he can. / Yes, she can.', '是的，他会。/ 是的，她会。'],
            ['否定回答 (Short -)', '第三人称 (He / She)', "No, he can't. / No, she can't.", '不，他不会。/ 不，她不会。'],
          ],
        },
        notes: [
          'can 是情态动词，无人称和数的变化：主语即使是第三人称单数 (he/she/it)，也绝不能加 -s (正确: He can swim；错误: He cans swim)。',
          'can 后面的动词必须紧跟实义动词的原形 (原形动词)，不能加 -s、-ing 或 to (正确: We can sing；错误: We can to sing / singing)。',
          "否定形式 can not 通常拼写为一个单词 cannot，缩写形式为 can't (/kɑːnt/ 或 /kænt/)。",
        ],
      },
      {
        title: 'Grammar 2: Prepositions of Time (时间介词 in / on / at 规律全景)',
        ruleSummary: '时间介词口诀：“年月季节上下晚，大段范围都用 in；具体某天和节日，星期几前牢记 on；点钟时刻精准点，黎明正午午夜 at。”',
        table: {
          headers: ['介词', '核心规则与适用范畴', '典型搭配短语 (Phrases)', '经典例句与中文释义'],
          rows: [
            ['in', '上下午与晚上 (泛指时间段)', 'in the morning / afternoon / evening', 'I usually do gymnastics in the morning. (我通常在早晨做体操。)'],
            ['in', '12 个月份 (Months)', 'in January / in February / in December', 'My birthday is in February. (我的生日在二月。)'],
            ['in', '一年四季 (Seasons)', 'in spring / summer / autumn / winter', 'We go skiing in winter. (我们冬天去滑雪。)'],
            ['in', '年份与世纪 (Years)', 'in 2024 / in 2026 / in the 21st century', 'The Olympic Games were held in 2024. (奥运会在2024年举办。)'],
            ['on', '星期几 (Days of the week)', 'on Monday / Tuesday / Friday', 'We have PE class on Monday. (我们周一有体育课。)'],
            ['on', '具体某一天 / 特定节日当天', "on New Year's Day / on Children's Day", 'We have a sports meet on Children\'s Day. (我们在儿童节举办运动会。)'],
            ['on', '具体带日期的日子 (Dates)', 'on January 1st / on July 4th', 'The marathon starts on January 1st. (马拉松赛在1月1日举行。)'],
            ['on', '具体某天的上午/下午/晚上', 'on Sunday morning / on Friday afternoon', 'I play basketball on Saturday morning. (我周六上午打篮球。)'],
            ['at', '钟表点钟与时刻 (Clock Time)', "at seven o'clock / at half past two", "The football match begins at seven o'clock. (足球赛在七点钟开始。)"],
            ['at', '正午、夜间与用餐时分', 'at noon / at night / at lunchtime', 'We rest at noon and sleep at night. (我们中午休息，晚上睡觉。)'],
            ['at', '特定周末与节日期间 (英式用法)', 'at the weekend / at Christmas', 'What sports do you do at the weekend? (你在周末做什么运动？)'],
          ],
        },
        notes: [
          '时间介词口诀牢记：in 年 in 月 in 季节，还有上午和傍晚；若逢具体某一天，on 字当头记心间；钟点时刻精准点，at 紧随不迟延。',
          '遇到 this, that, last, next, every 等限定词时，时间前面不加介词 (如 this morning, next Friday, last winter, every day)。',
          '具体某一天的上下午或晚上，由于具体到了特定某一天，必须用 on (如 on Monday morning，不可用 in Monday morning)。',
        ],
      },
      {
        title: 'Grammar 3: Telling the Time & Time Formulas (时间的顺读与逆读法则)',
        ruleSummary: '英式逆读法：分钟 ≤ 30 用 past（几点过几分），结构为“分钟 + past + 点钟”；分钟 > 30 用 to（差几分到下一点），结构为“差的分钟 (60-分) + to + 下一钟点”。15分钟用 quarter，30分钟用 half。',
        table: {
          headers: ['时间表述类型', '结构公式', '钟表时刻示例', '英式读法与表达'],
          rows: [
            ['整点 (o\'clock)', '点钟 + o\'clock', '2:00 / 7:00', "It's two o'clock. / It's seven o'clock. (两点整 / 七点整)"],
            ['几点过几分 (past)', '分钟 (< 30) + past + 钟点', '2:05 / 2:10 / 2:20', 'five past two (2:05) / ten past two (2:10) / twenty past two (2:20)'],
            ['一刻钟 past (15分)', 'quarter past + 钟点', '2:15 / 8:15', 'quarter past two (2:15) / quarter past eight (8:15)'],
            ['半点 (half past)', 'half past + 钟点 (30分)', '2:30 / 6:30', 'half past two (2:30) / half past six (6:30)'],
            ['差几分到下一点 (to)', '差的分钟 (60-分) + to + 下一钟点', '2:35 / 2:40 / 2:50', 'twenty-five to three (2:35) / twenty to three (2:40) / ten to three (2:50)'],
            ['差一刻到下一点 (45分)', 'quarter to + 下一钟点', '2:45 / 9:45', 'quarter to three (2:45) / quarter to ten (9:45)'],
          ],
        },
        notes: [
          'past 表示“过了”，指不超过半小时的分钟数；to 表示“差……到……”，指超过半小时后，差多少分钟到达下一个钟点。',
          '15 分钟通常不说 fifteen minutes，而说 (a) quarter (一刻钟)；30 分钟说 half (半小时)。',
          "询问时间的经典句型：What's the time, please? 或 What time is it? 回答一律用 It's ...",
        ],
      },
    ],
    speakingDialogues: [
      {
        title: 'Reading & Functions: Asking & Talking about Abilities (询问与交流运动能力)',
        items: [
          { speaker: 'Leo', en: 'Can you swim?', zh: '你会游泳吗？', responseEn: 'Yes, I can. I love swimming in summer.', responseZh: '是的，我会。我夏天非常喜欢游泳。' },
          { speaker: 'Mia', en: 'Can you skateboard?', zh: '你会玩滑板吗？', responseEn: "No, I can't. But I can cycle very fast.", responseZh: '不，我不会。但是我骑车能骑得非常快。' },
          { speaker: 'Jack', en: 'What sports can he do?', zh: '他会做哪些体育运动？', responseEn: 'He can ski and play basketball.', responseZh: '他会滑雪，还会打篮球。' },
          { speaker: 'Emma', en: 'Can she do gymnastics?', zh: '她会做体操吗？', responseEn: 'Yes, she can. She has gymnastics practice on Tuesdays.', responseZh: '是的，她会。她每周二都有体操训练。' },
          { speaker: 'Sam', en: 'Can they do Taekwondo?', zh: '他们会打跆拳道吗？', responseEn: 'Yes, they can. They both have black belts!', responseZh: '是的，他们会。他们两个都系上了黑带！' },
          { speaker: 'Lily', en: 'Do you want to play volleyball with us?', zh: '你想和我们一起打排球吗？', responseEn: 'Yes, I would love to! When does the game start?', responseZh: '太棒了，我很想去！比赛什么时候开始？' },
        ],
      },
      {
        title: 'Everyday English: Asking & Telling the Time (询问与告知时间)',
        items: [
          { speaker: 'Tom', en: "What's the time, please?", zh: '请问现在几点钟了？', responseEn: "It's half past two (2:30).", responseZh: '现在是两点半。' },
          { speaker: 'Amy', en: 'What time does the basketball match start?', zh: '篮球比赛什么时候开始？', responseEn: 'It starts at quarter past three (3:15).', responseZh: '比赛在三点一刻开始。' },
          { speaker: 'Ben', en: 'Is it ten past four right now?', zh: '现在是四点过十分吗？', responseEn: "No, it's twenty to five (4:40). We need to hurry!", responseZh: '不是，现在差二十分到五点 (4:40)。我们得抓紧了！' },
          { speaker: 'Lucy', en: 'When is your swimming lesson?', zh: '你的游泳课在什么时候？', responseEn: "It is on Saturday morning at ten o'clock.", responseZh: '在周六上午十点整。' },
          { speaker: 'David', en: 'What time do you usually get up on school days?', zh: '上学日你通常几点起床？', responseEn: "I get up at seven o'clock in the morning.", responseZh: '我通常在早上七点钟起床。' },
        ],
      },
      {
        title: 'Think Values: Sports Spirit & Healthy Living (体育精神与健康生活观念)',
        items: [
          { speaker: 'Coach', en: 'Why is it important to play sports regularly?', zh: '为什么定期参加体育运动很重要？', responseEn: 'Because sports keep our bodies strong, fit and energetic.', responseZh: '因为运动能让我们身体强壮、保持健康且充满活力。' },
          { speaker: 'Coach', en: 'What should we always do before exercising?', zh: '在运动锻炼前我们应该先做什么？', responseEn: 'We should always do warm-up exercises to protect ourselves.', responseZh: '我们应该先做热身准备活动，以防身体受伤。' },
          { speaker: 'Player', en: 'What should you do if your team loses a match?', zh: '如果你的队伍输掉了比赛，你应该怎么做？', responseEn: 'We shake hands with the winners and keep practising hard.', responseZh: '我们和获胜方握手致意，并继续刻苦训练。' },
          { speaker: 'Player', en: 'Is winning the only thing that matters in sports?', zh: '在体育运动中，获胜是唯一重要的事情吗？', responseEn: 'No! Having fun, teamwork and trying our best are more important.', responseZh: '不！享受乐趣、团队协作和全力以赴更加重要。' },
        ],
      },
    ],
    cultureSection: {
      title: 'Culture: Traditional Sports & World Games (世界传统运动与体育文化)',
      cards: [
        {
          title: 'The Olympic Games (奥林匹克运动会)',
          country: 'Greece & Worldwide (起源于希腊，盛行于全球)',
          flag: '🇬🇷',
          details: [
            'The ancient Olympic Games began in Olympia, Greece over 2,700 years ago.',
            'Today, summer and winter games bring together athletes from across the world every four years to celebrate friendship and peace.',
          ],
        },
        {
          title: 'Taekwondo (跆拳道)',
          country: 'South Korea (韩国)',
          flag: '🇰🇷',
          details: [
            'Taekwondo is a traditional Korean martial art famous for dynamic kicks and swift strikes.',
            'It emphasizes mental discipline, courtesy, respect for masters and continuous self-improvement.',
          ],
        },
        {
          title: 'Ice Hockey (冰球运动)',
          country: 'Canada & Northern Nations (加拿大与北欧各国)',
          flag: '🇨🇦',
          details: [
            'Ice hockey is played on ice rinks where players on skates use curved sticks to hit a hard rubber puck.',
            'It is Canada’s official national winter sport and one of the fastest team games in the world.',
          ],
        },
        {
          title: 'Cricket (板球运动)',
          country: 'The UK, India & Australia (英国、印度与澳大利亚)',
          flag: '🇬🇧',
          details: [
            'Cricket was developed in south-east England in the 16th century and became a classic gentleman’s game.',
            'It is loved by hundreds of millions of fans in India, Australia, Pakistan and South Africa.',
          ],
        },
      ],
    },
    writingGuide: {
      title: 'Writing Mind Map: My Favourite Sport (写作思维导图：我最喜爱的体育运动)',
      topic: 'My Favourite Sport (我最喜欢的运动)',
      branches: [
        {
          label: 'My Choice & Equipment (我的运动选择与装备)',
          icon: '🏀',
          templates: [
            { en: 'My favourite sport is [basketball / cycling / swimming / skiing].', zh: '我最喜爱的运动是[篮球 / 骑车 / 游泳 / 滑雪]。' },
            { en: 'To play this sport, I need [a good bike and helmet / a ball / comfortable trainers / goggles].', zh: '进行这项运动，我需要[一辆好单车和头盔 / 一个球 / 舒适的跑鞋 / 泳镜]。' },
          ],
        },
        {
          label: 'When & Where I Play (运动的时间与地点)',
          icon: '📅',
          templates: [
            { en: 'I usually practise on [Monday afternoon / sunny weekends].', zh: '我通常在[周一下午 / 晴朗的周末]进行练习。' },
            { en: 'We start at [half past four in the afternoon] at [the sports centre / school playground].', zh: '我们在[下午四点半]在[体育中心 / 学校操场]开始。' },
            { en: 'I often play with [my classmates / my father / my best friends].', zh: '我经常和[我的同班同学 / 我的爸爸 / 我最好的朋友们]一起玩。' },
          ],
        },
        {
          label: 'My Abilities & Skills (我的运动技能与表现)',
          icon: '⚡',
          templates: [
            { en: 'I can [run fast / shoot accurately / swim fifty metres / jump high].', zh: '我能[跑得很快 / 精准投篮 / 游泳五十米 / 跳得很高]。' },
            { en: "I can't [dive from a high board] yet, but I am practising hard every week.", zh: '我目前还不会[从高台跳水]，但我每周都在刻苦练习。' },
          ],
        },
        {
          label: 'Why I Love It (喜欢这项运动的原因与收获)',
          icon: '🌟',
          templates: [
            { en: 'I love this sport because it keeps me [fit, healthy and full of energy].', zh: '我热爱这项运动，因为它让我[保持体形、健康并且活力满满]。' },
            { en: 'Playing sports with my friends brings me [great happiness and teamwork spirit].', zh: '和小伙伴们一起运动给我带来了[无限的快乐和团队合作精神]。' },
          ],
        },
      ],
    },
  },
];
