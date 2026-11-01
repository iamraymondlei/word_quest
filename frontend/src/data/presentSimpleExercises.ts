// Present Simple (一般现在时) 专项训练 1 & 2 结构化题库数据

export interface VerbSingularItem {
  id: string;
  base: string;
  answer: string;
  ruleExplanation: string; // 语法规则解析
}

export interface MultipleChoiceItem {
  id: string;
  question: string;
  options: { label: string; text: string }[];
  answer: string; // e.g. "B"
  explanation: string;
}

export interface FillInBlankItem {
  id: string;
  sentenceBefore: string;
  baseVerb: string;
  sentenceAfter?: string;
  secondBlank?: {
    sentenceBefore: string;
    baseVerb: string;
    sentenceAfter?: string;
    answer: string;
  };
  answer: string;
  explanation: string;
}

export interface StoryClozeItem {
  blankIndex: number;
  baseVerb: string;
  answer: string;
  explanation: string;
}

export interface SentenceTransformItem {
  id: string;
  original: string;
  prompt: string; // e.g. "（改为否定句）"
  templateText?: string; // 填空提示如: "Daniel _______ TV every evening."
  answer: string; // 标准参考答案
  acceptedAnswers: string[]; // 容错答案
  explanation: string;
}

export interface GrammarExerciseUnit {
  id: 'unit1' | 'unit2';
  title: string;
  subtitle: string;
  verbTransformations?: VerbSingularItem[];
  multipleChoices?: MultipleChoiceItem[];
  fillInBlanks?: FillInBlankItem[];
  storyCloze?: {
    title: string;
    storySegments: {
      text: string;
      blankIndex?: number;
      baseVerb?: string;
    }[];
    blanks: StoryClozeItem[];
  };
  sentenceTransforms: SentenceTransformItem[];
}

export const PRESENT_SIMPLE_EXERCISES: GrammarExerciseUnit[] = [
  {
    id: 'unit1',
    title: '专题专练 1：一般现在时综合训练',
    subtitle: '动词第三人称单数规则变位、单项选择、动词形态填空与基础句型转换',
    verbTransformations: [
      { id: 'v1', base: 'wash', answer: 'washes', ruleExplanation: '以 sh 结尾的动词，词尾加 -es' },
      { id: 'v2', base: 'match', answer: 'matches', ruleExplanation: '以 ch 结尾的动词，词尾加 -es' },
      { id: 'v3', base: 'guess', answer: 'guesses', ruleExplanation: '以 ss 结尾的动词，词尾加 -es' },
      { id: 'v4', base: 'study', answer: 'studies', ruleExplanation: '辅音字母 + y 结尾，变 y 为 i 再加 -es' },
      { id: 'v5', base: 'finish', answer: 'finishes', ruleExplanation: '以 sh 结尾的动词，词尾加 -es' },
      { id: 'v6', base: 'go', answer: 'goes', ruleExplanation: '以 o 结尾的动词，词尾加 -es' },
      { id: 'v7', base: 'snow', answer: 'snows', ruleExplanation: '一般情况下直接加 -s' },
      { id: 'v8', base: 'carry', answer: 'carries', ruleExplanation: '辅音字母 + y 结尾，变 y 为 i 再加 -es' },
      { id: 'v9', base: 'stop', answer: 'stops', ruleExplanation: '一般情况下直接加 -s' },
      { id: 'v10', base: 'see', answer: 'sees', ruleExplanation: '一般情况下直接加 -s' },
      { id: 'v11', base: 'drive', answer: 'drives', ruleExplanation: '以不发音 e 结尾，直接加 -s' },
      { id: 'v12', base: 'let', answer: 'lets', ruleExplanation: '一般情况下直接加 -s' },
      { id: 'v13', base: 'keep', answer: 'keeps', ruleExplanation: '一般情况下直接加 -s' },
      { id: 'v14', base: 'find', answer: 'finds', ruleExplanation: '一般情况下直接加 -s' },
      { id: 'v15', base: 'think', answer: 'thinks', ruleExplanation: '一般情况下直接加 -s' },
      { id: 'v16', base: 'teach', answer: 'teaches', ruleExplanation: '以 ch 结尾的动词，词尾加 -es' },
      { id: 'v17', base: 'catch', answer: 'catches', ruleExplanation: '以 ch 结尾的动词，词尾加 -es' },
      { id: 'v18', base: 'stay', answer: 'stays', ruleExplanation: '元音字母 a + y 结尾，直接加 -s' },
      { id: 'v19', base: 'begin', answer: 'begins', ruleExplanation: '一般情况下直接加 -s' },
      { id: 'v20', base: 'run', answer: 'runs', ruleExplanation: '一般情况下直接加 -s' },
      { id: 'v21', base: 'prefer', answer: 'prefers', ruleExplanation: '一般情况下直接加 -s' },
      { id: 'v22', base: 'give', answer: 'gives', ruleExplanation: '以不发音 e 结尾，直接加 -s' },
      { id: 'v23', base: 'ring', answer: 'rings', ruleExplanation: '一般情况下直接加 -s' },
      { id: 'v24', base: 'dance', answer: 'dances', ruleExplanation: '以不发音 e 结尾，直接加 -s' },
    ],
    multipleChoices: [
      {
        id: 'mc1',
        question: '1. Where _______ Lucy come from?',
        options: [
          { label: 'A', text: 'do' },
          { label: 'B', text: 'does' },
          { label: 'C', text: 'is' },
          { label: 'D', text: 'are' },
        ],
        answer: 'B',
        explanation: 'Lucy 是第三人称单数，疑问句中有实义动词原形 come，一般现在时疑问句需借助助动词 does。',
      },
      {
        id: 'mc2',
        question: '2. Most of the students _______ China.',
        options: [
          { label: 'A', text: 'comes from' },
          { label: 'B', text: 'is from' },
          { label: 'C', text: 'are from' },
          { label: 'D', text: 'come of' },
        ],
        answer: 'C',
        explanation: '主语 Most of the students 是复数概念，be from 表示“来自...”，be 动词用 are。comes from 为单数不符合。',
      },
      {
        id: 'mc3',
        question: '3. We speak English _______.',
        options: [
          { label: 'A', text: 'every days' },
          { label: 'B', text: 'everyday' },
          { label: 'C', text: 'very day' },
          { label: 'D', text: 'every day' },
        ],
        answer: 'D',
        explanation: 'every day 是副词短语，在句中作时间状语，意为“每天”；everyday 是形容词，意为“日常的”。',
      },
      {
        id: 'mc4',
        question: '4. My math teacher _______ a big pair of glasses.',
        options: [
          { label: 'A', text: 'wears' },
          { label: 'B', text: 'put on' },
          { label: 'C', text: 'wear' },
          { label: 'D', text: 'puts on' },
        ],
        answer: 'A',
        explanation: '主语 My math teacher 为第三人称单数；wear 表示“戴着”的持续状态；put on 强调“戴上”的动作。',
      },
      {
        id: 'mc5',
        question: '5. What _______ your father and mother _______?',
        options: [
          { label: 'A', text: 'does, do' },
          { label: 'B', text: 'do, do' },
          { label: 'C', text: 'are, do' },
          { label: 'D', text: 'do, does' },
        ],
        answer: 'B',
        explanation: 'your father and mother 是两个人（复数主语），疑问句助动词用 do，句末实义动词还原为原形 do。',
      },
    ],
    fillInBlanks: [
      {
        id: 'fb1',
        sentenceBefore: '1. He often',
        baseVerb: 'have',
        sentenceAfter: 'dinner at home.',
        answer: 'has',
        explanation: '主语 He 是单数第三人称，often 提示一般现在时，have 的三单形式为 has。',
      },
      {
        id: 'fb2',
        sentenceBefore: '2. Mike sometimes',
        baseVerb: 'go',
        sentenceAfter: 'to the park with his sister.',
        answer: 'goes',
        explanation: '主语 Mike 是单数，sometimes 提示一般现在时，go 结尾加 -es 变为 goes。',
      },
      {
        id: 'fb3',
        sentenceBefore: '3. Every year my parents',
        baseVerb: 'give',
        sentenceAfter: 'me a present for my birthday.',
        answer: 'give',
        explanation: '主语 my parents 是复数名词，谓语动词用原形 give。',
      },
      {
        id: 'fb4',
        sentenceBefore: '4. Tom',
        baseVerb: 'do',
        sentenceAfter: 'his homework every day.',
        answer: 'does',
        explanation: '主语 Tom 是单数第三人称，do 的三单形式为 does。',
      },
      {
        id: 'fb5',
        sentenceBefore: '5.',
        baseVerb: 'wash',
        sentenceAfter: 'his car once a week? Yes, he does.',
        secondBlank: {
          sentenceBefore: 'your dad',
          baseVerb: 'wash',
          sentenceAfter: 'his car once a week? Yes, he does.',
          answer: 'wash',
        },
        answer: 'Does',
        explanation: '主语 your dad 是第三人称单数，一般疑问句句首用助动词 Does，实义动词还原用原形 wash。',
      },
      {
        id: 'fb6',
        sentenceBefore: '6. Lin Tao is a good student. He',
        baseVerb: 'study',
        sentenceAfter: 'very hard.',
        answer: 'studies',
        explanation: '主语 He 是第三人称单数，study 变 y 为 i 加 -es 得到 studies。',
      },
      {
        id: 'fb7',
        sentenceBefore: '7. They',
        baseVerb: 'work',
        sentenceAfter: 'at the bank.',
        answer: 'work',
        explanation: '主语 They 是复数代词，一般现在时谓语动词用原形 work。',
      },
    ],
    sentenceTransforms: [
      {
        id: 'st1',
        original: '1. My living room has three windows.',
        prompt: '（改为否定句）',
        templateText: 'My living room _______ _______ three windows.',
        answer: "My living room doesn't have three windows.",
        acceptedAnswers: [
          "My living room doesn't have three windows.",
          "my living room doesn't have three windows",
          "My living room does not have three windows.",
          "my living room does not have three windows",
          "doesn't have",
          "does not have",
        ],
        explanation: '原句动词 has 是实义动词单数形式，改为否定句需借助助动词 doesn\'t，动词还原为 have。',
      },
      {
        id: 'st2',
        original: '2. Jim and Jack like swimming on Sundays.',
        prompt: '（对划线部分提问: swimming）',
        templateText: '_______ _______ Jim and Jack like _______ on Sundays?',
        answer: 'What do Jim and Jack like doing on Sundays?',
        acceptedAnswers: [
          'What do Jim and Jack like doing on Sundays?',
          'what do jim and jack like doing on sundays?',
          'What do Jim and Jack like to do on Sundays?',
          'what do jim and jack like doing on sundays',
        ],
        explanation: '对进行的活动提问用疑问词 What，主语 Jim and Jack 是两个人用助动词 do，提问动作使用 like doing。',
      },
      {
        id: 'st3',
        original: '3. We are in the same class.',
        prompt: '（改为一般疑问句）',
        templateText: '_______ _______ in the same class?',
        answer: 'Are you in the same class?',
        acceptedAnswers: [
          'Are you in the same class?',
          'are you in the same class?',
          'Are we in the same class?',
          'are we in the same class?',
        ],
        explanation: '含有 be 动词 are 的句子，将 are 提前到句首，第一人称 we 通常转换为第二人称 you（转换为 are we 亦可）。',
      },
      {
        id: 'st4',
        original: '4. He comes from England.',
        prompt: '（对划线部分提问: England）',
        templateText: '_______ _______ he _______ from?',
        answer: 'Where does he come from?',
        acceptedAnswers: [
          'Where does he come from?',
          'where does he come from?',
          'Where is he from?',
          'where is he from?',
        ],
        explanation: '对国家/地点提问用 Where，comes from 是实义动词，借助助动词 does，动词还原为 come。',
      },
    ],
  },
  {
    id: 'unit2',
    title: '专题专练 2：一般现在时综合突破',
    subtitle: '动词形态巩固、短文篇章填空（Mrs. Black’s Day）与句型改写/同义句',
    fillInBlanks: [
      {
        id: 'u2_fb1',
        sentenceBefore: '1. I often',
        baseVerb: 'help',
        sentenceAfter: 'my mother with housework.',
        answer: 'help',
        explanation: '主语为第一人称 I，一般现在时动词用原形 help。',
      },
      {
        id: 'u2_fb2',
        sentenceBefore: '2. The girl',
        baseVerb: 'teach',
        sentenceAfter: 'us English on Sundays.',
        answer: 'teaches',
        explanation: '主语 The girl 为第三人称单数，teach 以 ch 结尾加 -es 变为 teaches。',
      },
      {
        id: 'u2_fb3',
        sentenceBefore: '3. He',
        baseVerb: 'have',
        sentenceAfter: 'music class on Mondays.',
        answer: 'has',
        explanation: '主语 He 为第三人称单数，have 的三单形式为 has。',
      },
      {
        id: 'u2_fb4',
        sentenceBefore: '4. How',
        baseVerb: 'do',
        sentenceAfter: '',
        secondBlank: {
          sentenceBefore: 'he',
          baseVerb: 'get',
          sentenceAfter: 'there?',
          answer: 'get',
        },
        answer: 'does',
        explanation: '主语 he 为单数，特殊疑问句借助助动词 does，后面的实义动词用原形 get。',
      },
      {
        id: 'u2_fb5',
        sentenceBefore: '5. She and I',
        baseVerb: 'take',
        sentenceAfter: 'a walk together every evening.',
        answer: 'take',
        explanation: 'She and I 表示“我和她”（两个人，复数主语），谓语动词用原形 take。',
      },
      {
        id: 'u2_fb6',
        sentenceBefore: '6. All of us',
        baseVerb: 'study',
        sentenceAfter: 'hard.',
        answer: 'study',
        explanation: 'All of us（我们所有人）是复数代词，谓语动词用原形 study。',
      },
      {
        id: 'u2_fb7',
        sentenceBefore: '7. She',
        baseVerb: 'go',
        sentenceAfter: 'to school from Monday to Friday.',
        answer: 'goes',
        explanation: '主语 She 是单数第三人称，go 词尾加 -es 变为 goes。',
      },
      {
        id: 'u2_fb8',
        sentenceBefore: '8. Grandma often',
        baseVerb: 'cook',
        sentenceAfter: 'dinner for our family.',
        answer: 'cooks',
        explanation: '主语 Grandma 是单数第三人称，cook 直接加 -s 变为 cooks。',
      },
    ],
    storyCloze: {
      title: "Mrs. Black's Day",
      storySegments: [
        { text: 'Mrs. Black often ' },
        { text: ' (get) up at 7:00 on Sunday morning. She ', blankIndex: 1, baseVerb: 'get' },
        { text: ' (have) breakfast at 8:30. She ', blankIndex: 2, baseVerb: 'have' },
        { text: ' (have) a little dog. She ', blankIndex: 3, baseVerb: 'have' },
        { text: ' (like) to go to the park with her dog. At 10:50, Mrs. Black sometimes ', blankIndex: 4, baseVerb: 'like' },
        { text: ' (wash) her clothes. At 3:00 p.m. she usually ', blankIndex: 5, baseVerb: 'wash' },
        { text: ' (go) shopping. She often ', blankIndex: 6, baseVerb: 'go' },
        { text: " (make) supper at 6:00 p.m. She doesn't ", blankIndex: 7, baseVerb: 'make' },
        { text: ' (watch) TV at night. She ', blankIndex: 8, baseVerb: 'watch' },
        { text: ' (go) to bed at about 10:30p.m.', blankIndex: 9, baseVerb: 'go' },
      ],
      blanks: [
        { blankIndex: 1, baseVerb: 'get', answer: 'gets', explanation: '主语 Mrs. Black 是单数第三人称，get 变为 gets。' },
        { blankIndex: 2, baseVerb: 'have', answer: 'has', explanation: '主语 She 是单数，have 的三单形式是 has。' },
        { blankIndex: 3, baseVerb: 'have', answer: 'has', explanation: '主语 She 是单数，have 的三单形式是 has。' },
        { blankIndex: 4, baseVerb: 'like', answer: 'likes', explanation: '主语 She 是单数，like 加 -s 变为 likes。' },
        { blankIndex: 5, baseVerb: 'wash', answer: 'washes', explanation: '主语 Mrs. Black 是单数，wash 结尾加 -es 变为 washes。' },
        { blankIndex: 6, baseVerb: 'go', answer: 'goes', explanation: '主语 she 是单数，go 结尾加 -es 变为 goes。' },
        { blankIndex: 7, baseVerb: 'make', answer: 'makes', explanation: '主语 She 是单数，make 加 -s 变为 makes。' },
        { blankIndex: 8, baseVerb: 'watch', answer: 'watch', explanation: "注意：前面已经有助动词 doesn't，否定句中后面的实义动词必须用原形 watch！" },
        { blankIndex: 9, baseVerb: 'go', answer: 'goes', explanation: '主语 She 是单数，go 结尾加 -es 变为 goes。' },
      ],
    },
    sentenceTransforms: [
      {
        id: 'u2_st1',
        original: '1. Daniel watches TV every evening.',
        prompt: '（改为否定句）',
        templateText: 'Daniel _______ _______ TV every evening.',
        answer: "Daniel doesn't watch TV every evening.",
        acceptedAnswers: [
          "Daniel doesn't watch TV every evening.",
          "daniel doesn't watch tv every evening.",
          "Daniel does not watch TV every evening.",
          "daniel does not watch tv every evening.",
          "doesn't watch",
          "does not watch",
        ],
        explanation: '主语 Daniel 是单数第三人称，否定句借助 doesn\'t，动词还原为原形 watch。',
      },
      {
        id: 'u2_st2',
        original: '2. I do my homework every day.',
        prompt: '（改为一般疑问句并作否定回答）',
        templateText: '—— _______ you _______ homework every day?\n—— No, I _______.',
        answer: 'Do you do homework every day? / No, I don\'t.',
        acceptedAnswers: [
          'Do you do homework every day? No, I don\'t.',
          'Do you do homework every day? / No, I don\'t.',
          'Do you do homework every day? No, I do not.',
          'Do, do, don\'t',
          'do, do, don\'t',
        ],
        explanation: '原句实义动词是 do，主语转为 you，疑问句句首加助动词 Do，否定回答用 No, I don\'t。',
      },
      {
        id: 'u2_st3',
        original: '3. She likes milk.',
        prompt: '（改为一般疑问句并作肯定回答）',
        templateText: '—— _______ she _______ milk?\n—— Yes, she _______.',
        answer: 'Does she like milk? / Yes, she does.',
        acceptedAnswers: [
          'Does she like milk? Yes, she does.',
          'Does she like milk? / Yes, she does.',
          'Does, like, does',
          'does, like, does',
        ],
        explanation: '主语 She 是单数第三人称，一般疑问句句首借助 Does，动词还原为 like，肯定回答用 Yes, she does。',
      },
      {
        id: 'u2_st4',
        original: '4. Simon is from Beijing.',
        prompt: '（同义句改写）',
        templateText: 'Simon _______ _______ Beijing.',
        answer: 'Simon comes from Beijing.',
        acceptedAnswers: [
          'Simon comes from Beijing.',
          'simon comes from beijing.',
          'comes from',
          'Comes from',
        ],
        explanation: 'be from 与 come from 为同义短语，表示“来自...”。主语 Simon 是单数，用 comes from。',
      },
      {
        id: 'u2_st5',
        original: '5. Tom is clever at Maths.',
        prompt: '（同义句改写）',
        templateText: 'Tom _______ _______ _______ Maths.',
        answer: 'Tom is good at Maths.',
        acceptedAnswers: [
          'Tom is good at Maths.',
          'tom is good at maths.',
          'Tom does well in Maths.',
          'is good at',
          'does well in',
        ],
        explanation: 'be clever at（在...方面聪明擅长）常与 be good at 或 do well in 进行同义替换。',
      },
    ],
  },
];
