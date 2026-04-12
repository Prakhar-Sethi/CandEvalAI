"""Seed sample coding problems. Run: python seed.py"""
import asyncio
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://hcl_user:hcl_pass@localhost:5432/hcl_db")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Language IDs: 71=Python3, 63=JavaScript, 62=Java, 54=C++

PROBLEMS = [
    {
        "id": "prob-001",
        "title": "Two Sum",
        "description": (
            "Given an array of integers `nums` and an integer `target`, return the **indices** of the two numbers "
            "that add up to `target`.\n\n"
            "You may assume exactly one solution exists. Return the smaller index first."
        ),
        "difficulty": "easy",
        "examples": [
            {"input": "nums = [2,7,11,15], target = 9", "output": "[0, 1]", "explanation": "nums[0] + nums[1] = 2 + 7 = 9"},
            {"input": "nums = [3,2,4], target = 6", "output": "[1, 2]", "explanation": "nums[1] + nums[2] = 2 + 4 = 6"},
        ],
        "constraints": "2 ≤ n ≤ 10^4 | -10^9 ≤ nums[i] ≤ 10^9 | Exactly one valid answer",
        "visible_test_cases": [
            {"id": 1, "input": "4\n2 7 11 15\n9", "expected_output": "0 1"},
            {"id": 2, "input": "3\n3 2 4\n6", "expected_output": "1 2"},
        ],
        "hidden_test_cases": [
            {"id": 3, "input": "2\n3 3\n6", "expected_output": "0 1"},
            {"id": 4, "input": "4\n3 2 4 6\n8", "expected_output": "1 3"},
        ],
        "starter_code": {
            "71": "def twoSum(nums: list, target: int) -> list:\n    pass\n",
            "63": "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n    \n}\n",
            "62": (
                "import java.util.*;\n\npublic class Solution {\n"
                "    public static int[] twoSum(int[] nums, int target) {\n"
                "        // your code here\n"
                "        return new int[]{};\n"
                "    }\n"
                "\n"
                "    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n"
                "        int n = sc.nextInt();\n"
                "        int[] nums = new int[n];\n"
                "        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();\n"
                "        int target = sc.nextInt();\n"
                "        int[] r = twoSum(nums, target);\n"
                "        System.out.println(r[0] + \" \" + r[1]);\n"
                "    }\n"
                "}\n"
            ),
            "54": (
                "#include <bits/stdc++.h>\nusing namespace std;\n\n"
                "vector<int> twoSum(vector<int>& nums, int target) {\n"
                "    // your code here\n"
                "    return {};\n"
                "}\n\n"
                "int main() {\n"
                "    int n; cin >> n;\n"
                "    vector<int> nums(n);\n"
                "    for (int i = 0; i < n; i++) cin >> nums[i];\n"
                "    int target; cin >> target;\n"
                "    auto r = twoSum(nums, target);\n"
                "    cout << r[0] << \" \" << r[1] << endl;\n"
                "    return 0;\n"
                "}\n"
            ),
        },
        "wrappers": {
            "71": (
                "\nn = int(input())\n"
                "nums = list(map(int, input().split()))\n"
                "target = int(input())\n"
                "result = twoSum(nums, target)\n"
                "print(*result)\n"
            ),
            "63": (
                "\nconst _lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\n"
                "const _n = parseInt(_lines[0]);\n"
                "const _nums = _lines[1].split(' ').map(Number);\n"
                "const _target = parseInt(_lines[2]);\n"
                "console.log(twoSum(_nums, _target).join(' '));\n"
            ),
            "62": "",
            "54": "",
        },
        "time_limit_seconds": 5,
        "memory_limit_mb": 128,
    },
    {
        "id": "prob-002",
        "title": "FizzBuzz",
        "description": (
            "Given an integer `n`, return a list of strings for each number from `1` to `n`:\n\n"
            "- `\"FizzBuzz\"` if divisible by both 3 and 5\n"
            "- `\"Fizz\"` if divisible by 3\n"
            "- `\"Buzz\"` if divisible by 5\n"
            "- The number itself (as a string) otherwise\n\n"
            "Print each result on a new line."
        ),
        "difficulty": "easy",
        "examples": [
            {"input": "n = 5", "output": "1\n2\nFizz\n4\nBuzz", "explanation": "3 → Fizz, 5 → Buzz"},
        ],
        "constraints": "1 ≤ n ≤ 10^4",
        "visible_test_cases": [
            {"id": 1, "input": "15", "expected_output": "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz"},
            {"id": 2, "input": "5", "expected_output": "1\n2\nFizz\n4\nBuzz"},
        ],
        "hidden_test_cases": [
            {"id": 3, "input": "1", "expected_output": "1"},
            {"id": 4, "input": "30", "expected_output": "\n".join(
                "FizzBuzz" if i % 15 == 0 else "Fizz" if i % 3 == 0 else "Buzz" if i % 5 == 0 else str(i)
                for i in range(1, 31)
            )},
        ],
        "starter_code": {
            "71": "def fizzBuzz(n: int) -> list:\n    pass\n",
            "63": "/**\n * @param {number} n\n * @return {string[]}\n */\nfunction fizzBuzz(n) {\n    \n}\n",
            "62": (
                "import java.util.*;\n\npublic class Solution {\n"
                "    public static List<String> fizzBuzz(int n) {\n"
                "        // your code here\n"
                "        return new ArrayList<>();\n"
                "    }\n"
                "\n"
                "    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n"
                "        int n = sc.nextInt();\n"
                "        for (String s : fizzBuzz(n)) System.out.println(s);\n"
                "    }\n"
                "}\n"
            ),
            "54": (
                "#include <bits/stdc++.h>\nusing namespace std;\n\n"
                "vector<string> fizzBuzz(int n) {\n"
                "    // your code here\n"
                "    return {};\n"
                "}\n\n"
                "int main() {\n"
                "    int n; cin >> n;\n"
                "    for (auto& s : fizzBuzz(n)) cout << s << '\\n';\n"
                "    return 0;\n"
                "}\n"
            ),
        },
        "wrappers": {
            "71": (
                "\nn = int(input())\n"
                "for s in fizzBuzz(n):\n"
                "    print(s)\n"
            ),
            "63": (
                "\nconst _lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\n"
                "const _n = parseInt(_lines[0]);\n"
                "console.log(fizzBuzz(_n).join('\\n'));\n"
            ),
            "62": "",
            "54": "",
        },
        "time_limit_seconds": 5,
        "memory_limit_mb": 128,
    },
    {
        "id": "prob-003",
        "title": "Palindrome Check",
        "description": (
            "Given a string `s`, determine if it is a **palindrome** — it reads the same forwards and backwards.\n\n"
            "Consider **only alphanumeric characters** and **ignore case**.\n\n"
            "Return `true` if palindrome, `false` otherwise."
        ),
        "difficulty": "medium",
        "examples": [
            {"input": "s = \"racecar\"", "output": "true", "explanation": "racecar reversed is racecar"},
            {"input": "s = \"hello\"", "output": "false", "explanation": "hello reversed is olleh"},
            {"input": "s = \"A man a plan a canal Panama\"", "output": "true", "explanation": "Alphanumeric only, case-insensitive"},
        ],
        "constraints": "1 ≤ len(s) ≤ 10^5 | s consists of printable ASCII characters",
        "visible_test_cases": [
            {"id": 1, "input": "racecar", "expected_output": "true"},
            {"id": 2, "input": "hello", "expected_output": "false"},
            {"id": 3, "input": "A man a plan a canal Panama", "expected_output": "true"},
        ],
        "hidden_test_cases": [
            {"id": 4, "input": " ", "expected_output": "true"},
            {"id": 5, "input": "Was it a car or a cat I saw", "expected_output": "true"},
            {"id": 6, "input": "OpenAI", "expected_output": "false"},
        ],
        "starter_code": {
            "71": "def isPalindrome(s: str) -> bool:\n    pass\n",
            "63": "/**\n * @param {string} s\n * @return {boolean}\n */\nfunction isPalindrome(s) {\n    \n}\n",
            "62": (
                "import java.util.*;\n\npublic class Solution {\n"
                "    public static boolean isPalindrome(String s) {\n"
                "        // your code here\n"
                "        return false;\n"
                "    }\n"
                "\n"
                "    public static void main(String[] args) {\n"
                "        Scanner sc = new Scanner(System.in);\n"
                "        String s = sc.nextLine();\n"
                "        System.out.println(isPalindrome(s));\n"
                "    }\n"
                "}\n"
            ),
            "54": (
                "#include <bits/stdc++.h>\nusing namespace std;\n\n"
                "bool isPalindrome(string s) {\n"
                "    // your code here\n"
                "    return false;\n"
                "}\n\n"
                "int main() {\n"
                "    string s;\n"
                "    getline(cin, s);\n"
                "    cout << (isPalindrome(s) ? \"true\" : \"false\") << endl;\n"
                "    return 0;\n"
                "}\n"
            ),
        },
        "wrappers": {
            "71": (
                "\ns = input()\n"
                "print('true' if isPalindrome(s) else 'false')\n"
            ),
            "63": (
                "\nconst _lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\n"
                "console.log(isPalindrome(_lines[0]) ? 'true' : 'false');\n"
            ),
            "62": "",
            "54": "",
        },
        "time_limit_seconds": 5,
        "memory_limit_mb": 128,
    },
]


async def seed():
    from database import Base, create_all_tables
    from models import Problem

    await create_all_tables()

    # Add new columns if they don't exist yet
    async with engine.begin() as conn:
        for col, default in [("starter_code", "'{}'::jsonb"), ("wrappers", "'{}'::jsonb")]:
            await conn.execute(text(
                f"ALTER TABLE m4_problems ADD COLUMN IF NOT EXISTS {col} JSONB DEFAULT {default}"
            ))

    async with AsyncSessionLocal() as db:
        for p_data in PROBLEMS:
            existing = await db.execute(select(Problem).where(Problem.id == p_data["id"]))
            prob = existing.scalar_one_or_none()
            if prob:
                # Update with new fields (use flag_modified for JSON columns)
                from sqlalchemy.orm.attributes import flag_modified
                for k, v in p_data.items():
                    setattr(prob, k, v)
                for json_col in ("visible_test_cases", "hidden_test_cases", "examples", "starter_code", "wrappers"):
                    flag_modified(prob, json_col)
                print(f"  [update] {p_data['title']}")
            else:
                db.add(Problem(**p_data))
                print(f"  [seed] {p_data['title']}")
        await db.commit()
    print("Seeding complete.")


if __name__ == "__main__":
    asyncio.run(seed())
