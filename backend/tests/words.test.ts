import 'dotenv/config';
import pool from '../src/config/db';
import express from 'express';
import islandRoutes from '../src/routes/islandRoutes';
import userRoutes from '../src/routes/userRoutes';
import progressRoutes from '../src/routes/progressRoutes';
import request from 'supertest';
import multer from 'multer';

jest.setTimeout(60000);

const app = express();
app.use(express.json());
app.use('/api/islands', islandRoutes);
app.use('/api/users', userRoutes);
app.use('/api/progress', progressRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size allowed is 5MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

describe('Island and Words API Tests', () => {
  beforeEach(async () => {
    // Clear all tables to ensure clean slate, including progress tables referencing foreign keys
    await pool.query('DELETE FROM user_word_progress');
    await pool.query('DELETE FROM user_island_progress');
    await pool.query('DELETE FROM words');
    await pool.query('DELETE FROM islands');
    await pool.query('DELETE FROM users');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should create or update island configurations manually', async () => {
    const islandData = {
      name: 'Adventure Island',
      story_title: 'The Great Adventure',
      story_passage: 'Once upon a time, a brave adventurer set foot on the island...',
      story_questions: [
        { question: 'Who set foot on the island?', options: ['An adventurer', 'A dragon'], answer: 'An adventurer' }
      ]
    };

    // Create island
    const response = await request(app)
      .post('/api/islands')
      .send(islandData);

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Adventure Island');
    expect(response.body.story_title).toBe('The Great Adventure');
    expect(response.body.story_questions[0].question).toBe('Who set foot on the island?');
    expect(response.body.story_passage_json).toBeNull();

    // Update island (ON DUPLICATE KEY UPDATE)
    const updatedData = {
      name: 'Adventure Island',
      story_title: 'The Lost Treasure',
      story_passage: 'The adventurer searched for the lost gold...',
      story_questions: [
        { question: 'What did the adventurer search for?', options: ['Gold', 'Silver'], answer: 'Gold' }
      ]
    };

    const updateResponse = await request(app)
      .post('/api/islands')
      .send(updatedData);

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.story_title).toBe('The Lost Treasure');
    expect(updateResponse.body.story_questions[0].question).toBe('What did the adventurer search for?');
    expect(updateResponse.body.story_passage_json).toBeNull();
  });

  it('should upload CSV and assign words to the correct island', async () => {
    const csvData = "word,translation,sentence,sentence_translation\nbanana,香蕉,I like banana.,我喜欢香蕉。";
    const buffer = Buffer.from(csvData, 'utf-8');

    const response = await request(app)
      .post('/api/islands/upload-words')
      .field('island_name', 'Fruit Island')
      .attach('file', buffer, 'test.csv');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Successfully imported 1 words to Fruit Island');

    // Get islands and check words & progress
    const getResponse = await request(app).get('/api/islands');
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.length).toBe(1);
    expect(getResponse.body[0].name).toBe('Fruit Island');
    expect(getResponse.body[0].unlocked_stage).toBe(1); // Default unlocked stage is 1 when no user_id is provided
    expect(getResponse.body[0].words.length).toBe(1);
    expect(getResponse.body[0].words[0].word).toBe('banana');
    expect(getResponse.body[0].words[0].translation).toBe('香蕉');
    expect(getResponse.body[0].words[0].sentence).toBe('I like banana.');
    expect(getResponse.body[0].words[0].sentence_translation).toBe('我喜欢香蕉。');
  });

  it('should update on duplicate key (ON DUPLICATE KEY UPDATE) for uploaded words', async () => {
    const csvData1 = "word,translation,sentence,sentence_translation\napple,苹果,This is an apple.,这是一个苹果。";
    const buffer1 = Buffer.from(csvData1, 'utf-8');

    const response1 = await request(app)
      .post('/api/islands/upload-words')
      .field('island_name', 'Fruit Island')
      .attach('file', buffer1, 'test.csv');
    expect(response1.status).toBe(200);

    const csvData2 = "word,translation,sentence,sentence_translation\napple,红苹果,This is a red apple.,这是一个红苹果。";
    const buffer2 = Buffer.from(csvData2, 'utf-8');

    const response2 = await request(app)
      .post('/api/islands/upload-words')
      .field('island_name', 'Fruit Island')
      .attach('file', buffer2, 'test.csv');
    expect(response2.status).toBe(200);

    const getResponse = await request(app).get('/api/islands');
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.length).toBe(1);
    expect(getResponse.body[0].words.length).toBe(1);
    expect(getResponse.body[0].words[0].word).toBe('apple');
    expect(getResponse.body[0].words[0].translation).toBe('红苹果');
    expect(getResponse.body[0].words[0].sentence).toBe('This is a red apple.');
    expect(getResponse.body[0].words[0].sentence_translation).toBe('这是一个红苹果。');
  });

  it('should correctly parse CSV rows containing commas inside quotes', async () => {
    const csvData = 'word,translation,sentence,sentence_translation\norange,橙子,"I like orange, apple, and grape.","我喜欢橙子，苹果，和葡萄。"';
    const buffer = Buffer.from(csvData, 'utf-8');

    const response = await request(app)
      .post('/api/islands/upload-words')
      .field('island_name', 'Fruit Island')
      .attach('file', buffer, 'test.csv');

    expect(response.status).toBe(200);

    const getResponse = await request(app).get('/api/islands');
    expect(getResponse.status).toBe(200);
    const fruitIsland = getResponse.body.find((isl: any) => isl.name === 'Fruit Island');
    expect(fruitIsland).toBeDefined();
    const orangeWord = fruitIsland.words.find((w: any) => w.word === 'orange');
    expect(orangeWord).toBeDefined();
    expect(orangeWord.sentence).toBe('I like orange, apple, and grape.');
    expect(orangeWord.sentence_translation).toBe('我喜欢橙子，苹果，和葡萄。');
  });

  it('should correctly preserve quotes in sentences like The word "apple" is a noun', async () => {
    const csvData = 'word,translation,sentence,sentence_translation\n' +
      'apple,苹果,"The word ""apple"" is a noun",这是一个苹果。\n' +
      'banana,香蕉,The word "banana" is a fruit,这是一个香蕉。';
    const buffer = Buffer.from(csvData, 'utf-8');

    const response = await request(app)
      .post('/api/islands/upload-words')
      .field('island_name', 'Grammar Island')
      .attach('file', buffer, 'test.csv');

    expect(response.status).toBe(200);

    const getResponse = await request(app).get('/api/islands');
    expect(getResponse.status).toBe(200);
    const grammarIsland = getResponse.body.find((isl: any) => isl.name === 'Grammar Island');
    expect(grammarIsland).toBeDefined();
    
    const appleWord = grammarIsland.words.find((w: any) => w.word === 'apple');
    expect(appleWord.sentence).toBe('The word "apple" is a noun');

    const bananaWord = grammarIsland.words.find((w: any) => w.word === 'banana');
    expect(bananaWord.sentence).toBe('The word "banana" is a fruit');
  });

  it('should return 413 if uploaded file exceeds 5MB', async () => {
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 100);

    const response = await request(app)
      .post('/api/islands/upload-words')
      .field('island_name', 'Fruit Island')
      .attach('file', largeBuffer, 'large_file.csv');

    expect(response.status).toBe(413);
    expect(response.body.error).toBe('File too large. Maximum size allowed is 5MB.');
  });

  it('should export spelling errors CSV and AI prompt for a user', async () => {
    // 1. Create a user
    const loginResponse = await request(app)
      .post('/api/users/login')
      .send({ username: 'errortester' });
    expect(loginResponse.status).toBe(200);
    const userId = loginResponse.body.id;

    // 2. Upload words
    const csvData = "word,translation,sentence,sentence_translation\nbanana,香蕉,I like banana.,我喜欢香蕉。\napple,苹果,An apple.,一个苹果。";
    const buffer = Buffer.from(csvData, 'utf-8');
    await request(app)
      .post('/api/islands/upload-words')
      .field('island_name', 'Fruit Island')
      .attach('file', buffer, 'test.csv');

    // Get the word IDs
    const islandsResponse = await request(app).get('/api/islands');
    const word1 = islandsResponse.body[0].words.find((w: any) => w.word === 'banana');
    const word2 = islandsResponse.body[0].words.find((w: any) => w.word === 'apple');

    // 3. Log errors
    await request(app)
      .post('/api/progress/log-error')
      .send({ user_id: userId, word_id: word1.id });
    await request(app)
      .post('/api/progress/log-error')
      .send({ user_id: userId, word_id: word1.id }); // banana has 2 errors
    await request(app)
      .post('/api/progress/log-error')
      .send({ user_id: userId, word_id: word2.id }); // apple has 1 error

    // 4. Export errors
    const exportResponse = await request(app)
      .get(`/api/islands/export-errors?user_id=${userId}`);

    expect(exportResponse.status).toBe(200);
    expect(exportResponse.body.csv).toContain('"banana","香蕉",2');
    expect(exportResponse.body.csv).toContain('"apple","苹果",1');
    expect(exportResponse.body.prompt).toContain('banana(香蕉)');
    expect(exportResponse.body.prompt).toContain('apple(苹果)');
  });

  describe('POST /api/islands/upload-story-csv', () => {
    let islandId: number;

    beforeEach(async () => {
      // Create a test island
      const createRes = await request(app)
        .post('/api/islands')
        .send({
          name: 'Story Island',
          story_title: 'Title',
          story_passage: 'Passage'
        });
      expect(createRes.status).toBe(200);
      islandId = createRes.body.id;
    });

    it('should successfully upload correct story CSV, sort it, and return in GET /api/islands', async () => {
      const csvData = `paragraph_num,sentence_num,sentence_text,translation
2,1,"Second paragraph, first sentence.","第二段，第一句。"
1,2,"First paragraph, second sentence.","第一段，第二句。"
1,1,"First paragraph, first sentence.","第一段，第一句。"`;
      const buffer = Buffer.from(csvData, 'utf-8');

      const uploadRes = await request(app)
        .post('/api/islands/upload-story-csv')
        .field('island_id', islandId)
        .attach('file', buffer, 'story.csv');

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.success).toBe(true);
      expect(uploadRes.body.data.length).toBe(3);

      // Verify the sorted order in response data
      expect(uploadRes.body.data[0].paragraph_num).toBe(1);
      expect(uploadRes.body.data[0].sentence_num).toBe(1);
      expect(uploadRes.body.data[1].paragraph_num).toBe(1);
      expect(uploadRes.body.data[1].sentence_num).toBe(2);
      expect(uploadRes.body.data[2].paragraph_num).toBe(2);
      expect(uploadRes.body.data[2].sentence_num).toBe(1);

      // Verify via GET /api/islands
      const getRes = await request(app).get('/api/islands');
      expect(getRes.status).toBe(200);
      const island = getRes.body.find((isl: any) => isl.id === islandId);
      expect(island).toBeDefined();
      expect(island.story_passage_json).toBeDefined();
      expect(island.story_passage_json.length).toBe(3);
      expect(island.story_passage_json[0].sentence_text).toBe('First paragraph, first sentence.');
      expect(island.story_passage_json[1].sentence_text).toBe('First paragraph, second sentence.');
      expect(island.story_passage_json[2].sentence_text).toBe('Second paragraph, first sentence.');
    });

    it('should return 400 if island_id is missing or invalid', async () => {
      const buffer = Buffer.from('paragraph_num,sentence_num,sentence_text,translation\n1,1,Text,Trans', 'utf-8');

      // Missing island_id
      const res1 = await request(app)
        .post('/api/islands/upload-story-csv')
        .attach('file', buffer, 'story.csv');
      expect(res1.status).toBe(400);
      expect(res1.body.error).toContain('Island ID is required');

      // Invalid island_id (string)
      const res2 = await request(app)
        .post('/api/islands/upload-story-csv')
        .field('island_id', 'abc')
        .attach('file', buffer, 'story.csv');
      expect(res2.status).toBe(400);
      expect(res2.body.error).toContain('Island ID must be an integer');
    });

    it('should return 400 if island_id does not exist', async () => {
      const buffer = Buffer.from('paragraph_num,sentence_num,sentence_text,translation\n1,1,Text,Trans', 'utf-8');
      const res = await request(app)
        .post('/api/islands/upload-story-csv')
        .field('island_id', 99999)
        .attach('file', buffer, 'story.csv');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Island not found');
    });

    it('should return 400 if no file is uploaded', async () => {
      const res = await request(app)
        .post('/api/islands/upload-story-csv')
        .field('island_id', islandId);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('No file uploaded');
    });

    it('should return 400 if CSV headers are incorrect', async () => {
      const csvData = `paragraph,sentence_num,sentence_text,translation
1,1,"Text","Trans"`;
      const buffer = Buffer.from(csvData, 'utf-8');
      const res = await request(app)
        .post('/api/islands/upload-story-csv')
        .field('island_id', islandId)
        .attach('file', buffer, 'story.csv');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('CSV headers must be exactly: paragraph_num, sentence_num, sentence_text, translation');
    });

    it('should return 400 if paragraph_num or sentence_num is not an integer', async () => {
      const csvData = `paragraph_num,sentence_num,sentence_text,translation
1.5,1,"Text","Trans"`;
      const buffer = Buffer.from(csvData, 'utf-8');
      const res = await request(app)
        .post('/api/islands/upload-story-csv')
        .field('island_id', islandId)
        .attach('file', buffer, 'story.csv');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('must be integers');
    });
  });

  describe('POST /api/islands/import-ai-story', () => {
    let originalFetch: typeof global.fetch;

    beforeAll(() => {
      originalFetch = global.fetch;
    });

    afterAll(() => {
      global.fetch = originalFetch;
    });

    it('should successfully parse AI story and vocabulary when AI agent returns success', async () => {
      const mockApiResponse = {
        success: true,
        data: {
          title: 'Forest Adventures',
          theme: '冒险与友谊',
          vocabulary: [
            {
              word: 'squirrel',
              phonetic: '/ˈskwɪrəl/',
              meaning: '松鼠',
              example_sentence: 'The squirrel climbed the tree.',
              example_translation: '松鼠爬上了树。'
            }
          ],
          pages: [
            {
              page: 1,
              sentences: [
                { en: 'Once upon a time in a forest.', zh: '从前在一片森林里。' },
                { en: 'A little squirrel saw a nut.', zh: '一只小松鼠看到了一个坚果。' }
              ]
            }
          ],
          questions: [
            {
              question: 'What did the squirrel see?',
              hint: 'A small nut',
              answer: 'The squirrel saw a nut.'
            }
          ]
        },
        error: null
      };

      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockApiResponse)
        })
      ) as any;

      const imgBuffer = Buffer.from('fake image content');

      const response = await request(app)
        .post('/api/islands/import-ai-story')
        .field('island_name', 'Forest Island')
        .field('question_count', 3)
        .attach('images', imgBuffer, 'page1.png');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe('Forest Adventures');
      expect(response.body.data.vocabulary.length).toBe(1);
      expect(response.body.data.pages.length).toBe(1);
      expect(response.body.data.questions.length).toBe(1);
    });

    it('should return parsed data even if island_name is not provided', async () => {
      const mockApiResponse = {
        success: true,
        data: {
          title: 'Parsed Island Name',
          theme: '探索',
          vocabulary: [],
          pages: [
            {
              page: 1,
              sentences: [{ en: 'Hello.', zh: '你好。' }]
            }
          ],
          questions: []
        },
        error: null
      };

      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockApiResponse)
        })
      ) as any;

      const imgBuffer = Buffer.from('fake image content');

      const response = await request(app)
        .post('/api/islands/import-ai-story')
        .attach('images', imgBuffer, 'page1.png');

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Parsed Island Name');
    });

    it('should return 400 if no image is uploaded', async () => {
      const response = await request(app)
        .post('/api/islands/import-ai-story')
        .field('island_name', 'No Image Island');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Please upload at least one image');
    });

    it('should return 400/500 if AI Agent returns an error', async () => {
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 502,
          text: () => Promise.resolve('Bad Gateway')
        })
      ) as any;

      const imgBuffer = Buffer.from('fake image');

      const response = await request(app)
        .post('/api/islands/import-ai-story')
        .attach('images', imgBuffer, 'page1.png');

      expect(response.status).toBe(502);
      expect(response.body.error).toContain('AI Agent returned error');
    });

    it('should default question_count to 5 if question_count is invalid or out of range', async () => {
      const mockApiResponse = {
        success: true,
        data: {
          title: 'Forest Island',
          theme: '冒险与友谊',
          vocabulary: [],
          pages: [],
          questions: []
        },
        error: null
      };

      let capturedFormData: any;
      global.fetch = jest.fn().mockImplementation((url, init) => {
        capturedFormData = init.body;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockApiResponse)
        });
      }) as any;

      const imgBuffer = Buffer.from('fake image');

      const response = await request(app)
        .post('/api/islands/import-ai-story')
        .field('island_name', 'Invalid Count Island')
        .field('question_count', '99')
        .attach('images', imgBuffer, 'page1.png');

      expect(response.status).toBe(200);
      expect(capturedFormData).toBeDefined();
      expect(capturedFormData.get('question_count')).toBe('5');
    });

    it('should return 500 with timeout message if AI Agent request times out', async () => {
      global.fetch = jest.fn().mockImplementation(() => {
        const err = new Error('The user aborted a request.');
        err.name = 'AbortError';
        return Promise.reject(err);
      }) as any;

      const imgBuffer = Buffer.from('fake image');

      const response = await request(app)
        .post('/api/islands/import-ai-story')
        .field('island_name', 'Timeout Island')
        .attach('images', imgBuffer, 'page1.png');

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('AI 解析服务请求超时，请稍后重试');
    });

    it('should forward custom prompt to AI Agent service when prompt is provided', async () => {
      const mockApiResponse = {
        success: true,
        data: {
          title: 'Custom Prompt Adventure',
          theme: 'Customized prompt theme',
          vocabulary: [],
          pages: [],
          questions: []
        },
        error: null
      };

      let capturedFormData: any;
      global.fetch = jest.fn().mockImplementation((url, init) => {
        capturedFormData = init.body;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockApiResponse)
        });
      }) as any;

      const customPrompt = 'You are a playful cartoon storyteller for Grade 1. Focus on cute animals.';
      const imgBuffer = Buffer.from('fake image');

      const response = await request(app)
        .post('/api/islands/import-ai-story')
        .field('island_name', 'Custom Island')
        .field('prompt', customPrompt)
        .attach('images', imgBuffer, 'page1.png');

      expect(response.status).toBe(200);
      expect(capturedFormData).toBeDefined();
      expect(capturedFormData.get('prompt')).toBe(customPrompt);
      expect(capturedFormData.get('custom_prompt')).toBe(customPrompt);
      expect(response.body.data.title).toBe('Custom Prompt Adventure');
    });

    it('should not forward prompt when custom prompt is empty or omitted', async () => {
      const mockApiResponse = {
        success: true,
        data: {
          title: 'Default Fallback Island',
          theme: 'Default fallback theme',
          vocabulary: [],
          pages: [],
          questions: []
        },
        error: null
      };

      let capturedFormData: any;
      global.fetch = jest.fn().mockImplementation((url, init) => {
        capturedFormData = init.body;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockApiResponse)
        });
      }) as any;

      const imgBuffer = Buffer.from('fake image');

      const response = await request(app)
        .post('/api/islands/import-ai-story')
        .field('island_name', 'Default Island')
        .field('prompt', '   ')
        .attach('images', imgBuffer, 'page1.png');

      expect(response.status).toBe(200);
      expect(capturedFormData).toBeDefined();
      expect(capturedFormData.get('prompt')).toBeNull();
      expect(capturedFormData.get('custom_prompt')).toBeNull();
    });

    it('should select valid prompt when custom_prompt is whitespace-only string', async () => {
      const mockApiResponse = {
        success: true,
        data: {
          title: 'Whitespace Custom Prompt Fallback',
          theme: 'Theme',
          vocabulary: [],
          pages: [],
          questions: []
        },
        error: null
      };

      let capturedFormData: any;
      global.fetch = jest.fn().mockImplementation((url, init) => {
        capturedFormData = init.body;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockApiResponse)
        });
      }) as any;

      const imgBuffer = Buffer.from('fake image');

      const response = await request(app)
        .post('/api/islands/import-ai-story')
        .field('island_name', 'Whitespace Test Island')
        .field('custom_prompt', '    ')
        .field('prompt', 'Valid Prompt Content')
        .attach('images', imgBuffer, 'page1.png');

      expect(response.status).toBe(200);
      expect(capturedFormData).toBeDefined();
      expect(capturedFormData.get('prompt')).toBe('Valid Prompt Content');
      expect(capturedFormData.get('custom_prompt')).toBe('Valid Prompt Content');
    });

    it('should select valid custom_prompt when prompt is whitespace-only string', async () => {
      const mockApiResponse = {
        success: true,
        data: {
          title: 'Whitespace Prompt Fallback',
          theme: 'Theme',
          vocabulary: [],
          pages: [],
          questions: []
        },
        error: null
      };

      let capturedFormData: any;
      global.fetch = jest.fn().mockImplementation((url, init) => {
        capturedFormData = init.body;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockApiResponse)
        });
      }) as any;

      const imgBuffer = Buffer.from('fake image');

      const response = await request(app)
        .post('/api/islands/import-ai-story')
        .field('island_name', 'Whitespace Test Island 2')
        .field('custom_prompt', 'Valid Custom Prompt Content')
        .field('prompt', '    ')
        .attach('images', imgBuffer, 'page1.png');

      expect(response.status).toBe(200);
      expect(capturedFormData).toBeDefined();
      expect(capturedFormData.get('prompt')).toBe('Valid Custom Prompt Content');
      expect(capturedFormData.get('custom_prompt')).toBe('Valid Custom Prompt Content');
    });
  });

  describe('Story Grouping & Filter Tests (REQ-000004)', () => {
    it('should parse group_name in POST /api/islands and fallback to General when omitted', async () => {
      // 1. Create island without group_name
      const res1 = await request(app)
        .post('/api/islands')
        .send({
          name: 'Island Without Group',
          story_title: 'Default Group Story'
        });
      expect(res1.status).toBe(200);
      expect(res1.body.name).toBe('Island Without Group');
      expect(res1.body.group_name).toBe('General');

      // 2. Create island with custom group_name
      const res2 = await request(app)
        .post('/api/islands')
        .send({
          name: 'Island With Group',
          group_name: 'Science & Nature',
          story_title: 'Galaxy Quest'
        });
      expect(res2.status).toBe(200);
      expect(res2.body.name).toBe('Island With Group');
      expect(res2.body.group_name).toBe('Science & Nature');

      // 3. Update island to a new group_name
      const res3 = await request(app)
        .post('/api/islands')
        .send({
          name: 'Island With Group',
          group_name: 'Space Adventures',
          story_title: 'Galaxy Quest Updated'
        });
      expect(res3.status).toBe(200);
      expect(res3.body.group_name).toBe('Space Adventures');
      expect(res3.body.story_title).toBe('Galaxy Quest Updated');
    });

    it('should filter islands with ?group= query parameter', async () => {
      // Create 3 islands with different groups
      await request(app).post('/api/islands').send({ name: 'Story Alpha', group_name: 'ThemeA', story_title: 'Alpha Title' });
      await request(app).post('/api/islands').send({ name: 'Story Beta', group_name: 'ThemeA', story_title: 'Beta Title' });
      await request(app).post('/api/islands').send({ name: 'Story Gamma', group_name: 'ThemeB', story_title: 'Gamma Title' });
      await request(app).post('/api/islands').send({ name: 'Story Delta', story_title: 'Delta Title' }); // default General

      // 1. Filter by ThemeA
      const resThemeA = await request(app).get('/api/islands?group=ThemeA');
      expect(resThemeA.status).toBe(200);
      expect(resThemeA.body.length).toBe(2);
      expect(resThemeA.body.every((isl: any) => isl.group_name === 'ThemeA')).toBe(true);

      // 2. Filter by ThemeB
      const resThemeB = await request(app).get('/api/islands?group=ThemeB');
      expect(resThemeB.status).toBe(200);
      expect(resThemeB.body.length).toBe(1);
      expect(resThemeB.body[0].name).toBe('Story Gamma');
      expect(resThemeB.body[0].group_name).toBe('ThemeB');

      // 3. Filter by General (default group)
      const resGeneral = await request(app).get('/api/islands?group=General');
      expect(resGeneral.status).toBe(200);
      expect(resGeneral.body.length).toBe(1);
      expect(resGeneral.body[0].name).toBe('Story Delta');
      expect(resGeneral.body[0].group_name).toBe('General');

      // 4. Query with group=ALL returns all 4 stories
      const resAll = await request(app).get('/api/islands?group=ALL');
      expect(resAll.status).toBe(200);
      expect(resAll.body.length).toBe(4);

      // 5. Query without group parameter returns all 4 stories
      const resNoFilter = await request(app).get('/api/islands');
      expect(resNoFilter.status).toBe(200);
      expect(resNoFilter.body.length).toBe(4);
    });

    it('should support group filtering combined with user-specific sector access', async () => {
      // Create user
      const userRes = await request(app).post('/api/users/login').send({ username: 'GroupStudent' });
      const userId = userRes.body.id;

      // Create 2 ThemeA islands and 1 ThemeB island
      const i1 = await request(app).post('/api/islands').send({ name: 'ThemeA Story 1', group_name: 'ThemeA' });
      const i2 = await request(app).post('/api/islands').send({ name: 'ThemeA Story 2', group_name: 'ThemeA' });
      const i3 = await request(app).post('/api/islands').send({ name: 'ThemeB Story 1', group_name: 'ThemeB' });

      // Grant user access ONLY to ThemeA Story 1 and ThemeB Story 1
      await pool.query('INSERT INTO user_island_access (user_id, island_id) VALUES (?, ?), (?, ?)', [
        userId, i1.body.id,
        userId, i3.body.id
      ]);

      // 1. When querying with user_id and group=ThemeA, only ThemeA Story 1 should be returned
      const resUserThemeA = await request(app).get(`/api/islands?user_id=${userId}&group=ThemeA`);
      expect(resUserThemeA.status).toBe(200);
      expect(resUserThemeA.body.length).toBe(1);
      expect(resUserThemeA.body[0].id).toBe(i1.body.id);
      expect(resUserThemeA.body[0].group_name).toBe('ThemeA');

      // 2. When querying with user_id and group=ALL, both accessible islands (i1, i3) should be returned
      const resUserAll = await request(app).get(`/api/islands?user_id=${userId}&group=ALL`);
      expect(resUserAll.status).toBe(200);
      expect(resUserAll.body.length).toBe(2);
      expect(resUserAll.body.map((i: any) => i.id).sort()).toEqual([i1.body.id, i3.body.id].sort());
    });

    it('should handle group_name in POST /api/islands/upload-words', async () => {
      const csvData = "word,translation,sentence,sentence_translation\nrocket,火箭,Look at the rocket.,看那个火箭。";
      const buffer = Buffer.from(csvData, 'utf-8');

      const response = await request(app)
        .post('/api/islands/upload-words')
        .field('island_name', 'Space Station')
        .field('group_name', 'Astronomy')
        .attach('file', buffer, 'space.csv');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const getRes = await request(app).get('/api/islands?group=Astronomy');
      expect(getRes.status).toBe(200);
      expect(getRes.body.length).toBe(1);
      expect(getRes.body[0].name).toBe('Space Station');
      expect(getRes.body[0].group_name).toBe('Astronomy');
    });

    it('should preserve existing group_name when updating an island without group_name in request body', async () => {
      // 1. Create an island with custom group_name
      const createRes = await request(app)
        .post('/api/islands')
        .send({
          name: 'Preserved Group Island',
          group_name: 'History & Culture',
          story_title: 'Ancient Egypt'
        });
      expect(createRes.status).toBe(200);
      expect(createRes.body.group_name).toBe('History & Culture');

      // 2. Update the island with legacy payload (no group_name field)
      const updateRes = await request(app)
        .post('/api/islands')
        .send({
          name: 'Preserved Group Island',
          story_title: 'Ancient Egypt Revised'
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.story_title).toBe('Ancient Egypt Revised');
      expect(updateRes.body.group_name).toBe('History & Culture'); // Must be preserved, not reset to General!

      // 3. Verify in database via GET /api/islands
      const getRes = await request(app).get('/api/islands');
      const found = getRes.body.find((i: any) => i.name === 'Preserved Group Island');
      expect(found).toBeDefined();
      expect(found.group_name).toBe('History & Culture');
    });

    it('should preserve existing group_name when uploading CSV words without group_name', async () => {
      // 1. Create an island with custom group
      await request(app)
        .post('/api/islands')
        .send({
          name: 'Music Island',
          group_name: 'Arts & Music'
        });

      // 2. Upload words CSV without specifying group_name
      const csvData = "word,translation,sentence,sentence_translation\npiano,钢琴,She plays the piano.,她弹钢琴。";
      const buffer = Buffer.from(csvData, 'utf-8');

      const response = await request(app)
        .post('/api/islands/upload-words')
        .field('island_name', 'Music Island')
        .attach('file', buffer, 'music.csv');

      expect(response.status).toBe(200);

      // 3. Verify group_name remained 'Arts & Music'
      const getRes = await request(app).get('/api/islands');
      const found = getRes.body.find((i: any) => i.name === 'Music Island');
      expect(found).toBeDefined();
      expect(found.group_name).toBe('Arts & Music');
    });

    it('should reject reserved group name ALL and __ALL__ (case-insensitive) with 400', async () => {
      // 1. In POST /api/islands with 'ALL'
      const res1 = await request(app)
        .post('/api/islands')
        .send({
          name: 'Invalid Group Island 1',
          group_name: 'ALL'
        });
      expect(res1.status).toBe(400);
      expect(res1.body.error).toContain('is reserved');

      // 2. In POST /api/islands with 'all'
      const res2 = await request(app)
        .post('/api/islands')
        .send({
          name: 'Invalid Group Island 2',
          group_name: 'all'
        });
      expect(res2.status).toBe(400);
      expect(res2.body.error).toContain('is reserved');

      // 3. In POST /api/islands with '__ALL__'
      const res3 = await request(app)
        .post('/api/islands')
        .send({
          name: 'Invalid Group Island 3',
          group_name: '__ALL__'
        });
      expect(res3.status).toBe(400);
      expect(res3.body.error).toContain('is reserved');

      // 4. In POST /api/islands with '__all__'
      const res4 = await request(app)
        .post('/api/islands')
        .send({
          name: 'Invalid Group Island 4',
          group_name: '__all__'
        });
      expect(res4.status).toBe(400);
      expect(res4.body.error).toContain('is reserved');

      // 5. In POST /api/islands/upload-words with '__ALL__'
      const csvData = "word,translation,sentence,sentence_translation\napple,苹果,An apple.,一个苹果。";
      const buffer = Buffer.from(csvData, 'utf-8');
      const res5 = await request(app)
        .post('/api/islands/upload-words')
        .field('island_name', 'Invalid Upload Island')
        .field('group_name', '__ALL__')
        .attach('file', buffer, 'test.csv');
      expect(res5.status).toBe(400);
      expect(res5.body.error).toContain('is reserved');
    });
  });
});
