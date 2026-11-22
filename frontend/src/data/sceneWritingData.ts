// Unit 8 场景描写写作专项（Describe a Scene）数据定义：公园 / 操场 / 音乐会

export type SceneWritingId = 'sw_park' | 'sw_playground' | 'sw_concert';

export interface SceneHotspot {
  id: string;
  label: string;
  zhLabel: string;
  subject: string;
  action: string;
  clothes: string;
  position: string;
  hintSentence: string;
}

export interface SceneWordBank {
  weather: string[];
  locations: string[];
  actions: string[];
  clothes: string[];
  adjectives: string[];
  prepositions: string[];
  feelings: string[];
}

export interface SceneWritingTopic {
  quizId: SceneWritingId;
  stageLabel: string;
  icon: string;
  title: string;
  zhTitle: string;
  subtitle: string;
  defaultTitleExample: string;
  hotspots: SceneHotspot[];
  wordBank: SceneWordBank;
  modelEssay: {
    title: string;
    paragraphs: string[];
    zhSummary: string;
  };
}

export const SCENE_WRITING_TOPICS: SceneWritingTopic[] = [
  {
    quizId: 'sw_park',
    stageLabel: 'SCENE 01',
    icon: '🌳',
    title: 'A Day in the Park',
    zhTitle: '公园一日',
    subtitle: '观察公园草地、大树和小路上的 5 组人物，写出天气、活动、穿着与环境细节',
    defaultTitleExample: 'A Day in the Park',
    hotspots: [
      {
        id: 'park_kite',
        label: 'Me (Flying a kite)',
        zhLabel: '“我”正在放风筝',
        subject: 'I',
        action: 'flying a colourful kite',
        clothes: 'a blue T-shirt and shorts',
        position: 'on the green grass',
        hintSentence: 'I am flying a colourful kite on the green grass.',
      },
      {
        id: 'park_read',
        label: 'Girl under the tree',
        zhLabel: '树下看书的女孩',
        subject: 'A girl / She',
        action: 'sitting and reading a book',
        clothes: 'a yellow T-shirt and a skirt',
        position: 'under the big tree',
        hintSentence: 'A girl in a yellow T-shirt is sitting under the big tree.',
      },
      {
        id: 'park_bike',
        label: 'Boy on a bike',
        zhLabel: '小路上骑车的男孩',
        subject: 'A boy / He',
        action: 'riding a red bike',
        clothes: 'a green jumper and jeans',
        position: 'on the path',
        hintSentence: 'A boy is riding a red bike on the path.',
      },
      {
        id: 'park_run',
        label: 'Two kids running',
        zhLabel: '草地上奔跑的孩子',
        subject: 'Some kids / They',
        action: 'running and laughing',
        clothes: 'white trainers and T-shirts',
        position: 'near the lake',
        hintSentence: 'Some kids are running happily near the lake.',
      },
      {
        id: 'park_dog',
        label: 'Man with a dog',
        zhLabel: '遛狗的叔叔',
        subject: 'A man',
        action: 'walking his cute dog',
        clothes: 'a brown coat and trousers',
        position: 'next to the bench',
        hintSentence: 'A man is wearing a brown coat and walking his dog next to the bench.',
      },
    ],
    wordBank: {
      weather: ['fine', 'sunny', 'warm', 'windy', 'cloudy'],
      locations: ['in the park', 'on the green grass', 'under the big tree', 'near the lake', 'next to the bench'],
      actions: ['flying a kite', 'riding a bike', 'running', 'reading a book', 'sitting', 'walking a dog'],
      clothes: ['a yellow T-shirt', 'a blue T-shirt', 'a skirt', 'a pair of jeans', 'a brown coat', 'white trainers'],
      adjectives: ['green', 'blue', 'big', 'colourful', 'cute', 'sunny', 'warm'],
      prepositions: ['in', 'on', 'under', 'near', 'next to'],
      feelings: ['happy', 'relaxed', 'excited', 'wonderful'],
    },
    modelEssay: {
      title: 'A Day in the Park',
      paragraphs: [
        "It's a sunny and warm day today. I'm in the park with my family. The sky is blue and the grass is green.",
        'Look! Some kids are running near the lake. A boy is wearing a green jumper and riding a red bike on the path. A girl has got big eyes, and she is wearing a yellow T-shirt. She is sitting under the big tree and reading a book. I am flying a colourful kite on the grass.',
        'Everyone is smiling. I feel very happy and relaxed. I have a great time!',
      ],
      zhSummary: '范文结构：天气开头 + 公园环境细节（蓝天绿草）+ 4 句现在进行时 + 服饰描述（绿色套头衫、黄色T恤）+ 方位介词（near/on/under）+ 感受结尾。',
    },
  },
  {
    quizId: 'sw_playground',
    stageLabel: 'SCENE 02',
    icon: '🏀',
    title: 'Fun on the Playground',
    zhTitle: '操场欢乐时光',
    subtitle: '观察校园操场上打篮球、跑步、跳绳、聊天的同学们，描绘活力课间画面',
    defaultTitleExample: 'Fun on the Playground',
    hotspots: [
      {
        id: 'pg_basketball',
        label: 'Boys playing basketball',
        zhLabel: '打篮球的男孩们',
        subject: 'Two boys / They',
        action: 'playing basketball',
        clothes: 'blue T-shirts and a pair of trainers',
        position: 'in the middle of the playground',
        hintSentence: 'Two boys are playing basketball in the middle of the playground.',
      },
      {
        id: 'pg_run',
        label: 'Girl running on track',
        zhLabel: '跑道上奔跑的女孩',
        subject: 'A tall girl / She',
        action: 'running fast',
        clothes: 'a red T-shirt and shorts',
        position: 'on the track',
        hintSentence: 'A tall girl is wearing a red T-shirt and running fast on the track.',
      },
      {
        id: 'pg_talk',
        label: 'Friends talking',
        zhLabel: '大树旁聊天的朋友',
        subject: 'Two friends / They',
        action: 'talking and smiling',
        clothes: 'a purple jumper and jeans',
        position: 'near the big tree',
        hintSentence: 'Two friends are talking and smiling near the big tree.',
      },
      {
        id: 'pg_jump',
        label: 'Me (Jumping / Playing)',
        zhLabel: '“我”正在跳绳/玩耍',
        subject: 'I',
        action: 'jumping and playing with my friend',
        clothes: 'a white shirt and sports shoes',
        position: 'behind the bench',
        hintSentence: 'I am wearing white trainers and jumping with my friend.',
      },
    ],
    wordBank: {
      weather: ['fine', 'sunny', 'cool', 'windy', 'cloudy'],
      locations: ['on the playground', 'on the track', 'in the middle of the playground', 'near the big tree', 'next to the hoop'],
      actions: ['playing basketball', 'running fast', 'talking', 'smiling', 'jumping', 'drinking water'],
      clothes: ['a blue T-shirt', 'a red T-shirt', 'a pair of shorts', 'a pair of trainers', 'a purple jumper', 'a pair of jeans'],
      adjectives: ['big', 'tall', 'fast', 'red', 'blue', 'busy', 'noisy'],
      prepositions: ['on', 'in', 'near', 'behind', 'next to'],
      feelings: ['excited', 'happy', 'tired', 'great'],
    },
    modelEssay: {
      title: 'Fun on the Playground',
      paragraphs: [
        "It's a fine and sunny day today. I'm on the school playground with my classmates. The playground is big and lively.",
        'Look at the students! Two boys are wearing blue T-shirts and white trainers. They are playing basketball in the middle of the playground. A tall girl in red shorts is running fast on the track. Near the big tree, two friends are talking and smiling. I am drinking cool water next to the bench.',
        'We are a little tired, but I feel very excited and happy!',
      ],
      zhSummary: '范文结构：操场开篇 + 篮球/跑步/聊天/喝水多句进行时 + 穿着（蓝色T恤、运动鞋、红短裤）+ 方位（in the middle of / on / near / next to）+ 感受结尾。',
    },
  },
  {
    quizId: 'sw_concert',
    stageLabel: 'SCENE 03',
    icon: '🎤',
    title: 'At the Music Show',
    zhTitle: '音乐会现场',
    subtitle: '结合 Unit 8 音乐主题：舞台歌手、DJ、欢呼人群与酷炫穿搭，写出热闹现场感',
    defaultTitleExample: 'At the Music Show',
    hotspots: [
      {
        id: 'con_singer',
        label: 'Singer on the stage',
        zhLabel: '舞台上唱歌的歌手',
        subject: 'A singer / She',
        action: 'singing a pop song',
        clothes: 'a shiny pink dress and boots',
        position: 'on the bright stage',
        hintSentence: 'A singer is wearing a pink dress and singing on the bright stage.',
      },
      {
        id: 'con_dj',
        label: 'DJ behind the desk',
        zhLabel: '调音台后的 DJ',
        subject: 'The DJ / He',
        action: 'playing cool music',
        clothes: 'a black T-shirt and sunglasses',
        position: 'behind the music desk',
        hintSentence: 'The DJ is playing cool music behind the music desk.',
      },
      {
        id: 'con_crowd',
        label: 'Crowd dancing',
        zhLabel: '人群中跳舞的观众',
        subject: 'Many people / The crowd',
        action: 'dancing and cheering',
        clothes: 'cool jackets and jeans',
        position: 'in front of the stage',
        hintSentence: 'Many people are dancing and cheering in front of the stage.',
      },
      {
        id: 'con_me',
        label: 'Me (Clapping & Smiling)',
        zhLabel: '“我”正在跟着节奏鼓掌',
        subject: 'I',
        action: 'clapping and taking photos',
        clothes: 'a yellow jumper and jeans',
        position: 'in the middle of the crowd',
        hintSentence: 'I am wearing a yellow jumper and clapping in the middle of the crowd.',
      },
    ],
    wordBank: {
      weather: ['fine', 'warm', 'clear', 'windy', 'cool'],
      locations: ['at the music show', 'on the stage', 'in front of the stage', 'behind the desk', 'in the middle of the crowd'],
      actions: ['singing', 'dancing', 'playing music', 'cheering', 'clapping', 'taking photos', 'smiling'],
      clothes: ['a pink dress', 'a black T-shirt', 'a yellow jumper', 'a pair of jeans', 'a cool coat', 'a pair of trainers'],
      adjectives: ['bright', 'loud', 'fantastic', 'amazing', 'pink', 'cool', 'wonderful'],
      prepositions: ['at', 'on', 'in', 'in front of', 'behind'],
      feelings: ['excited', 'happy', 'fantastic', 'amazing'],
    },
    modelEssay: {
      title: 'At the Music Show',
      paragraphs: [
        "It's a warm and clear evening today. I'm at a fantastic music show at the local youth club. The lights are bright and colourful.",
        'Look at the stage! A young singer is wearing a pretty pink dress. She is singing an amazing pop song on the stage. Behind the desk, a DJ in a black T-shirt is playing cool music. In front of the stage, many people are dancing and cheering loudly. I am wearing my yellow jumper and jeans, and I am clapping in the middle of the crowd.',
        'The rhythm is wonderful! I feel super excited and happy!',
      ],
      zhSummary: '范文结构：紧扣 Unit 8 音乐会/青年俱乐部主题 + 4 组进行时动作 + 粉裙/黑T恤/黄卫衣穿搭 + 舞台前后方位介词 + 激动感受结尾。',
    },
  },
];
