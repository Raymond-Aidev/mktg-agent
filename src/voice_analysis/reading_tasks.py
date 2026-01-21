"""
Reading Task Manager Module

Manages standardized reading tasks for speech analysis.
Provides sentences and passages designed to elicit specific
speech patterns for cognitive assessment.

Task design principles:
- Phonetically balanced content
- Appropriate difficulty for elderly speakers
- Standardized length for consistent comparison
- Linguistic features that reveal cognitive processing
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum
import random


class TaskDifficulty(Enum):
    """Difficulty levels for reading tasks."""
    EASY = "easy"         # Simple, common words
    MEDIUM = "medium"     # Standard vocabulary
    HARD = "hard"         # Complex or uncommon words


class TaskType(Enum):
    """Types of reading tasks."""
    SENTENCE = "sentence"           # Single sentence
    PARAGRAPH = "paragraph"         # Short paragraph
    WORD_LIST = "word_list"         # List of words
    NUMBER_SEQUENCE = "number"      # Number reading


@dataclass
class ReadingTask:
    """A standardized reading task."""
    id: str
    text: str
    task_type: TaskType
    difficulty: TaskDifficulty
    expected_syllables: int
    expected_duration: float  # seconds at normal pace
    language: str = "ko"  # Korean default
    phonetic_features: List[str] = field(default_factory=list)
    notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'text': self.text,
            'task_type': self.task_type.value,
            'difficulty': self.difficulty.value,
            'expected_syllables': self.expected_syllables,
            'expected_duration': self.expected_duration,
            'language': self.language,
        }


class ReadingTaskManager:
    """
    Manages reading tasks for speech analysis.

    Provides standardized tasks in Korean for cognitive speech assessment.
    Tasks are designed to:
    - Be phonetically balanced
    - Have predictable timing characteristics
    - Reveal speech production patterns
    - Be appropriate for elderly speakers
    """

    # Standardized Korean reading tasks
    KOREAN_TASKS = {
        # Easy sentences - common words, simple structure
        'ko_easy_01': ReadingTask(
            id='ko_easy_01',
            text='오늘 날씨가 참 좋습니다.',
            task_type=TaskType.SENTENCE,
            difficulty=TaskDifficulty.EASY,
            expected_syllables=10,
            expected_duration=3.0,
            language='ko',
            phonetic_features=['basic_consonants', 'basic_vowels'],
            notes='Simple weather statement'
        ),
        'ko_easy_02': ReadingTask(
            id='ko_easy_02',
            text='아침에 일어나서 밥을 먹었습니다.',
            task_type=TaskType.SENTENCE,
            difficulty=TaskDifficulty.EASY,
            expected_syllables=13,
            expected_duration=3.5,
            language='ko',
            phonetic_features=['nasals', 'stops'],
            notes='Daily routine description'
        ),
        'ko_easy_03': ReadingTask(
            id='ko_easy_03',
            text='가족들과 함께 시간을 보냅니다.',
            task_type=TaskType.SENTENCE,
            difficulty=TaskDifficulty.EASY,
            expected_syllables=12,
            expected_duration=3.5,
            language='ko',
            phonetic_features=['fricatives', 'affricates'],
            notes='Family time statement'
        ),

        # Medium sentences - moderate vocabulary, varied structure
        'ko_medium_01': ReadingTask(
            id='ko_medium_01',
            text='건강을 위해서 매일 운동하는 습관을 기르는 것이 중요합니다.',
            task_type=TaskType.SENTENCE,
            difficulty=TaskDifficulty.MEDIUM,
            expected_syllables=24,
            expected_duration=6.0,
            language='ko',
            phonetic_features=['complex_syllables', 'sentence_final'],
            notes='Health advice'
        ),
        'ko_medium_02': ReadingTask(
            id='ko_medium_02',
            text='서울에서 부산까지 기차로 약 두 시간 반이 걸립니다.',
            task_type=TaskType.SENTENCE,
            difficulty=TaskDifficulty.MEDIUM,
            expected_syllables=19,
            expected_duration=5.0,
            language='ko',
            phonetic_features=['numbers', 'compound_nouns'],
            notes='Travel distance information'
        ),
        'ko_medium_03': ReadingTask(
            id='ko_medium_03',
            text='우리나라의 전통 음식은 세계적으로 인정받고 있습니다.',
            task_type=TaskType.SENTENCE,
            difficulty=TaskDifficulty.MEDIUM,
            expected_syllables=20,
            expected_duration=5.5,
            language='ko',
            phonetic_features=['compound_words', 'formal_endings'],
            notes='Cultural statement'
        ),

        # Hard sentences - complex vocabulary, longer structure
        'ko_hard_01': ReadingTask(
            id='ko_hard_01',
            text='현대 사회에서 기술 발전이 우리 일상생활에 미치는 영향은 매우 광범위하고 다양합니다.',
            task_type=TaskType.SENTENCE,
            difficulty=TaskDifficulty.HARD,
            expected_syllables=35,
            expected_duration=9.0,
            language='ko',
            phonetic_features=['sino_korean', 'complex_compounds'],
            notes='Technology impact statement'
        ),
        'ko_hard_02': ReadingTask(
            id='ko_hard_02',
            text='환경 보호를 위한 지속 가능한 발전 전략을 수립하는 것이 국제 사회의 중요한 과제입니다.',
            task_type=TaskType.SENTENCE,
            difficulty=TaskDifficulty.HARD,
            expected_syllables=38,
            expected_duration=10.0,
            language='ko',
            phonetic_features=['academic_vocabulary', 'nominalization'],
            notes='Environmental policy statement'
        ),

        # Standard paragraph - Aesop-style content
        'ko_paragraph_01': ReadingTask(
            id='ko_paragraph_01',
            text='옛날에 한 농부가 살았습니다. 그는 매일 아침 일찍 일어나서 밭에 나가 일을 했습니다. '
                 '비가 오나 눈이 오나 성실하게 일한 덕분에 가을에는 풍성한 수확을 거두었습니다.',
            task_type=TaskType.PARAGRAPH,
            difficulty=TaskDifficulty.MEDIUM,
            expected_syllables=55,
            expected_duration=15.0,
            language='ko',
            phonetic_features=['narrative', 'temporal_markers', 'varied_sentence_length'],
            notes='Traditional story paragraph'
        ),

        # Number sequences for precise timing analysis
        'ko_numbers_01': ReadingTask(
            id='ko_numbers_01',
            text='일, 이, 삼, 사, 오, 육, 칠, 팔, 구, 십',
            task_type=TaskType.NUMBER_SEQUENCE,
            difficulty=TaskDifficulty.EASY,
            expected_syllables=10,
            expected_duration=5.0,
            language='ko',
            phonetic_features=['numbers', 'consistent_rhythm'],
            notes='Basic number counting'
        ),

        # Word list for articulation testing
        'ko_words_01': ReadingTask(
            id='ko_words_01',
            text='사과, 바나나, 포도, 귤, 수박, 딸기, 복숭아, 참외',
            task_type=TaskType.WORD_LIST,
            difficulty=TaskDifficulty.EASY,
            expected_syllables=18,
            expected_duration=6.0,
            language='ko',
            phonetic_features=['food_vocabulary', 'varied_initial_consonants'],
            notes='Fruit vocabulary list'
        ),
    }

    # English tasks for bilingual support
    ENGLISH_TASKS = {
        'en_easy_01': ReadingTask(
            id='en_easy_01',
            text='The weather is very nice today.',
            task_type=TaskType.SENTENCE,
            difficulty=TaskDifficulty.EASY,
            expected_syllables=8,
            expected_duration=2.5,
            language='en',
            phonetic_features=['basic_consonants', 'basic_vowels'],
            notes='Simple weather statement'
        ),
        'en_medium_01': ReadingTask(
            id='en_medium_01',
            text='Regular exercise and a balanced diet are essential for maintaining good health.',
            task_type=TaskType.SENTENCE,
            difficulty=TaskDifficulty.MEDIUM,
            expected_syllables=22,
            expected_duration=6.0,
            language='en',
            phonetic_features=['consonant_clusters', 'varied_vowels'],
            notes='Health advice'
        ),
        # Rainbow Passage (standardized reading passage)
        'en_rainbow': ReadingTask(
            id='en_rainbow',
            text='When the sunlight strikes raindrops in the air, they act as a prism and form a rainbow. '
                 'The rainbow is a division of white light into many beautiful colors.',
            task_type=TaskType.PARAGRAPH,
            difficulty=TaskDifficulty.MEDIUM,
            expected_syllables=42,
            expected_duration=12.0,
            language='en',
            phonetic_features=['standardized', 'phonetically_balanced'],
            notes='Partial Rainbow Passage - standard reading assessment'
        ),
    }

    def __init__(self, language: str = 'ko'):
        """
        Initialize task manager.

        Args:
            language: Default language ('ko' or 'en')
        """
        self.language = language
        self.tasks = {**self.KOREAN_TASKS, **self.ENGLISH_TASKS}

    def get_task(self, task_id: str) -> Optional[ReadingTask]:
        """
        Get a specific task by ID.

        Args:
            task_id: Task identifier

        Returns:
            ReadingTask or None if not found
        """
        return self.tasks.get(task_id)

    def get_tasks_by_difficulty(
        self,
        difficulty: TaskDifficulty,
        language: Optional[str] = None
    ) -> List[ReadingTask]:
        """
        Get all tasks of a specific difficulty.

        Args:
            difficulty: TaskDifficulty level
            language: Filter by language (optional)

        Returns:
            List of matching ReadingTask objects
        """
        lang = language or self.language
        return [
            task for task in self.tasks.values()
            if task.difficulty == difficulty and task.language == lang
        ]

    def get_tasks_by_type(
        self,
        task_type: TaskType,
        language: Optional[str] = None
    ) -> List[ReadingTask]:
        """
        Get all tasks of a specific type.

        Args:
            task_type: TaskType
            language: Filter by language (optional)

        Returns:
            List of matching ReadingTask objects
        """
        lang = language or self.language
        return [
            task for task in self.tasks.values()
            if task.task_type == task_type and task.language == lang
        ]

    def get_random_task(
        self,
        difficulty: Optional[TaskDifficulty] = None,
        task_type: Optional[TaskType] = None,
        language: Optional[str] = None
    ) -> ReadingTask:
        """
        Get a random task matching criteria.

        Args:
            difficulty: Filter by difficulty (optional)
            task_type: Filter by type (optional)
            language: Filter by language (optional)

        Returns:
            Random matching ReadingTask
        """
        lang = language or self.language
        candidates = [
            task for task in self.tasks.values()
            if task.language == lang
            and (difficulty is None or task.difficulty == difficulty)
            and (task_type is None or task.task_type == task_type)
        ]

        if not candidates:
            raise ValueError("No tasks match the specified criteria")

        return random.choice(candidates)

    def get_assessment_sequence(
        self,
        language: Optional[str] = None
    ) -> List[ReadingTask]:
        """
        Get a standardized assessment sequence.

        Returns tasks in recommended order for cognitive assessment:
        1. Easy sentence (warm-up)
        2. Medium sentence
        3. Paragraph
        4. Hard sentence (if appropriate)

        Args:
            language: Language for tasks

        Returns:
            List of ReadingTask in assessment order
        """
        lang = language or self.language
        sequence = []

        # 1. Easy warm-up
        easy_tasks = self.get_tasks_by_difficulty(TaskDifficulty.EASY, lang)
        sentence_easy = [t for t in easy_tasks if t.task_type == TaskType.SENTENCE]
        if sentence_easy:
            sequence.append(random.choice(sentence_easy))

        # 2. Medium sentence
        medium_tasks = self.get_tasks_by_difficulty(TaskDifficulty.MEDIUM, lang)
        sentence_medium = [t for t in medium_tasks if t.task_type == TaskType.SENTENCE]
        if sentence_medium:
            sequence.append(random.choice(sentence_medium))

        # 3. Paragraph
        paragraphs = self.get_tasks_by_type(TaskType.PARAGRAPH, lang)
        medium_paragraphs = [t for t in paragraphs if t.difficulty == TaskDifficulty.MEDIUM]
        if medium_paragraphs:
            sequence.append(random.choice(medium_paragraphs))

        return sequence

    def add_custom_task(self, task: ReadingTask):
        """
        Add a custom reading task.

        Args:
            task: ReadingTask to add
        """
        self.tasks[task.id] = task

    def list_all_tasks(self, language: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List all available tasks.

        Args:
            language: Filter by language (optional)

        Returns:
            List of task information dictionaries
        """
        lang = language or self.language
        return [
            {
                'id': task.id,
                'text': task.text[:50] + '...' if len(task.text) > 50 else task.text,
                'type': task.task_type.value,
                'difficulty': task.difficulty.value,
                'duration': f"{task.expected_duration}s",
            }
            for task in self.tasks.values()
            if task.language == lang
        ]

    def estimate_syllables(self, text: str, language: str = 'ko') -> int:
        """
        Estimate syllable count for custom text.

        Args:
            text: Text to analyze
            language: Language of text

        Returns:
            Estimated syllable count
        """
        if language == 'ko':
            # Korean: roughly 1 syllable per character (excluding spaces/punctuation)
            import re
            korean_chars = re.findall(r'[가-힣]', text)
            return len(korean_chars)
        else:
            # English: simple vowel-based estimation
            import re
            words = text.split()
            syllables = 0
            for word in words:
                word = word.lower()
                vowels = len(re.findall(r'[aeiou]', word))
                # Adjust for silent e and diphthongs
                if word.endswith('e') and vowels > 1:
                    vowels -= 1
                syllables += max(1, vowels)
            return syllables
