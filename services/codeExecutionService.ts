/**
 * Code Execution Service — Piston API
 * Free, open-source remote code execution for 15+ languages.
 * API: https://emkc.org/api/v2/piston
 */

const PISTON_API = 'https://emkc.org/api/v2/piston';

export interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    signal: string | null;
    language: string;
    version: string;
}

export interface LanguageConfig {
    id: string;
    label: string;
    pistonId: string;
    pistonVersion: string;
    extension: string;
    icon: string;
    iconPrefix?: string;
    defaultCode: string;
    supportsStdin: boolean;
    isWebLang?: boolean; // HTML/CSS/JS — rendered in iframe, not Piston
}

export const LANGUAGES: LanguageConfig[] = [
    {
        id: 'python', label: 'Python', pistonId: 'python', pistonVersion: '3.10.0',
        extension: '.py', icon: 'fa-python', iconPrefix: 'fab',
        defaultCode: '# Python 3.10\nname = input("Enter your name: ")\nprint(f"Hello, {name}! Welcome to Cognify.")\n\nfor i in range(1, 6):\n    print(f"  Step {i}: Learning...")\n\nprint("\\n✅ All steps complete!")',
        supportsStdin: true,
    },
    {
        id: 'javascript', label: 'JavaScript', pistonId: 'javascript', pistonVersion: '18.15.0',
        extension: '.js', icon: 'fa-js', iconPrefix: 'fab',
        defaultCode: '// JavaScript (Node.js 18)\nconst greet = (name) => {\n  console.log(`Hello, ${name}! 🚀`);\n  console.log("Running on Cognify Playground");\n};\n\ngreet("Developer");\n\n// Array operations\nconst nums = [1, 2, 3, 4, 5];\nconst squares = nums.map(n => n ** 2);\nconsole.log("Squares:", squares);',
        supportsStdin: false,
    },
    {
        id: 'typescript', label: 'TypeScript', pistonId: 'typescript', pistonVersion: '5.0.3',
        extension: '.ts', icon: 'fa-code', iconPrefix: 'fas',
        defaultCode: '// TypeScript 5.0\ninterface User {\n  name: string;\n  level: number;\n}\n\nconst user: User = { name: "Learner", level: 1 };\nconsole.log(`Welcome ${user.name}, Level ${user.level}`);\n\nconst fibonacci = (n: number): number =>\n  n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2);\n\nfor (let i = 0; i < 8; i++) {\n  console.log(`fib(${i}) = ${fibonacci(i)}`);\n}',
        supportsStdin: false,
    },
    {
        id: 'c', label: 'C', pistonId: 'c', pistonVersion: '10.2.0',
        extension: '.c', icon: 'fa-c', iconPrefix: 'fas',
        defaultCode: '#include <stdio.h>\n\nint main() {\n    char name[50];\n    printf("Enter your name: ");\n    scanf("%s", name);\n    printf("Hello, %s! Welcome to Cognify.\\n", name);\n\n    for (int i = 1; i <= 5; i++) {\n        printf("  Counting: %d\\n", i);\n    }\n    return 0;\n}',
        supportsStdin: true,
    },
    {
        id: 'cpp', label: 'C++', pistonId: 'c++', pistonVersion: '10.2.0',
        extension: '.cpp', icon: 'fa-code', iconPrefix: 'fas',
        defaultCode: '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    string name;\n    cout << "Enter your name: ";\n    cin >> name;\n    cout << "Hello, " << name << "! 🚀" << endl;\n\n    vector<int> nums = {5, 3, 8, 1, 9, 2};\n    sort(nums.begin(), nums.end());\n    cout << "Sorted: ";\n    for (int n : nums) cout << n << " ";\n    cout << endl;\n    return 0;\n}',
        supportsStdin: true,
    },
    {
        id: 'java', label: 'Java', pistonId: 'java', pistonVersion: '15.0.2',
        extension: '.java', icon: 'fa-java', iconPrefix: 'fab',
        defaultCode: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.print("Enter your name: ");\n        String name = sc.nextLine();\n        System.out.println("Hello, " + name + "! Welcome to Cognify.");\n\n        for (int i = 1; i <= 5; i++) {\n            System.out.println("  Step " + i + ": Learning Java...");\n        }\n    }\n}',
        supportsStdin: true,
    },
    {
        id: 'csharp', label: 'C#', pistonId: 'csharp.net', pistonVersion: '5.0.201',
        extension: '.cs', icon: 'fa-code', iconPrefix: 'fas',
        defaultCode: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.Write("Enter your name: ");\n        string name = Console.ReadLine();\n        Console.WriteLine($"Hello, {name}! Welcome to Cognify.");\n\n        for (int i = 1; i <= 5; i++)\n            Console.WriteLine($"  Step {i}: Learning C#...");\n    }\n}',
        supportsStdin: true,
    },
    {
        id: 'go', label: 'Go', pistonId: 'go', pistonVersion: '1.16.2',
        extension: '.go', icon: 'fa-code', iconPrefix: 'fas',
        defaultCode: 'package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n)\n\nfunc main() {\n\treader := bufio.NewReader(os.Stdin)\n\tfmt.Print("Enter your name: ")\n\tname, _ := reader.ReadString(\'\\n\')\n\tfmt.Printf("Hello, %s! Welcome to Cognify.\\n", name)\n\n\tfor i := 1; i <= 5; i++ {\n\t\tfmt.Printf("  Step %d: Learning Go...\\n", i)\n\t}\n}',
        supportsStdin: true,
    },
    {
        id: 'rust', label: 'Rust', pistonId: 'rust', pistonVersion: '1.68.2',
        extension: '.rs', icon: 'fa-gear', iconPrefix: 'fas',
        defaultCode: 'use std::io;\n\nfn main() {\n    println!("Enter your name:");\n    let mut name = String::new();\n    io::stdin().read_line(&mut name).unwrap();\n    println!("Hello, {}! Welcome to Cognify.", name.trim());\n\n    let nums: Vec<i32> = (1..=5).collect();\n    let sum: i32 = nums.iter().sum();\n    println!("Sum of 1..5 = {}", sum);\n}',
        supportsStdin: true,
    },
    {
        id: 'ruby', label: 'Ruby', pistonId: 'ruby', pistonVersion: '3.0.1',
        extension: '.rb', icon: 'fa-gem', iconPrefix: 'fas',
        defaultCode: '# Ruby 3.0\nprint "Enter your name: "\nname = gets.chomp\nputs "Hello, #{name}! Welcome to Cognify."\n\n5.times do |i|\n  puts "  Step #{i + 1}: Learning Ruby..."\nend\n\nputs "\\n✅ All steps complete!"',
        supportsStdin: true,
    },
    {
        id: 'php', label: 'PHP', pistonId: 'php', pistonVersion: '8.2.3',
        extension: '.php', icon: 'fa-php', iconPrefix: 'fab',
        defaultCode: '<?php\necho "Enter your name: ";\n$name = trim(fgets(STDIN));\necho "Hello, $name! Welcome to Cognify.\\n";\n\nfor ($i = 1; $i <= 5; $i++) {\n    echo "  Step $i: Learning PHP...\\n";\n}\necho "\\n✅ All steps complete!\\n";\n?>',
        supportsStdin: true,
    },
    {
        id: 'swift', label: 'Swift', pistonId: 'swift', pistonVersion: '5.3.3',
        extension: '.swift', icon: 'fa-swift', iconPrefix: 'fab',
        defaultCode: 'import Foundation\n\nprint("Hello from Swift! 🚀")\n\nlet nums = [1, 2, 3, 4, 5]\nlet sum = nums.reduce(0, +)\nprint("Sum of \\(nums) = \\(sum)")\n\nfor i in 1...5 {\n    print("  Step \\(i): Learning Swift...")\n}',
        supportsStdin: false,
    },
    {
        id: 'kotlin', label: 'Kotlin', pistonId: 'kotlin', pistonVersion: '1.8.20',
        extension: '.kt', icon: 'fa-code', iconPrefix: 'fas',
        defaultCode: 'fun main() {\n    print("Enter your name: ")\n    val name = readLine() ?: "Learner"\n    println("Hello, $name! Welcome to Cognify.")\n\n    val nums = listOf(1, 2, 3, 4, 5)\n    println("Sum = ${nums.sum()}")\n    println("Squares = ${nums.map { it * it }}")\n}',
        supportsStdin: true,
    },
    {
        id: 'lua', label: 'Lua', pistonId: 'lua', pistonVersion: '5.4.4',
        extension: '.lua', icon: 'fa-moon', iconPrefix: 'fas',
        defaultCode: '-- Lua 5.4\nio.write("Enter your name: ")\nlocal name = io.read()\nprint("Hello, " .. name .. "! Welcome to Cognify.")\n\nfor i = 1, 5 do\n    print("  Step " .. i .. ": Learning Lua...")\nend\n\nprint("\\n✅ All steps complete!")',
        supportsStdin: true,
    },
    {
        id: 'html', label: 'HTML/CSS/JS', pistonId: '', pistonVersion: '',
        extension: '.html', icon: 'fa-html5', iconPrefix: 'fab',
        defaultCode: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <style>\n    * { margin: 0; padding: 0; box-sizing: border-box; }\n    body {\n      font-family: \'Segoe UI\', sans-serif;\n      background: linear-gradient(135deg, #0f172a, #1e293b);\n      color: white;\n      min-height: 100vh;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n    }\n    .card {\n      background: rgba(255,255,255,0.05);\n      border: 1px solid rgba(255,255,255,0.1);\n      border-radius: 16px;\n      padding: 40px;\n      text-align: center;\n      backdrop-filter: blur(10px);\n    }\n    h1 { font-size: 2rem; margin-bottom: 8px; }\n    p { color: #94a3b8; }\n    .btn {\n      margin-top: 20px;\n      padding: 12px 24px;\n      background: #6366f1;\n      border: none;\n      border-radius: 8px;\n      color: white;\n      font-weight: bold;\n      cursor: pointer;\n      transition: transform 0.2s;\n    }\n    .btn:hover { transform: scale(1.05); }\n  </style>\n</head>\n<body>\n  <div class="card">\n    <h1>🚀 Hello, Cognify!</h1>\n    <p>Edit this code and see the live preview</p>\n    <button class="btn" onclick="alert(\'It works!\')">Click Me</button>\n  </div>\n</body>\n</html>',
        supportsStdin: false,
        isWebLang: true,
    },
];

export function getLanguageById(id: string): LanguageConfig | undefined {
    return LANGUAGES.find(l => l.id === id);
}

export function getFileName(lang: LanguageConfig): string {
    if (lang.id === 'java') return 'Main.java';
    return `main${lang.extension}`;
}

export async function executeCode(
    languageId: string,
    code: string,
    stdin: string = ''
): Promise<ExecutionResult> {
    const lang = getLanguageById(languageId);
    if (!lang) throw new Error(`Unsupported language: ${languageId}`);

    if (lang.isWebLang) {
        // HTML/CSS/JS is handled client-side via iframe — not executed via Piston
        return {
            stdout: '[Live Preview] HTML/CSS/JS is rendered in the preview tab.',
            stderr: '',
            exitCode: 0,
            signal: null,
            language: lang.label,
            version: 'Browser',
        };
    }

    const response = await fetch(`${PISTON_API}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            language: lang.pistonId,
            version: lang.pistonVersion,
            files: [{ name: getFileName(lang), content: code }],
            stdin: stdin || '',
            run_timeout: 10000, // 10s max
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Piston API error (${response.status}): ${errText}`);
    }

    const data = await response.json();

    return {
        stdout: data.run?.stdout || '',
        stderr: data.run?.stderr || data.compile?.stderr || '',
        exitCode: data.run?.code ?? -1,
        signal: data.run?.signal || null,
        language: data.language || lang.label,
        version: data.version || lang.pistonVersion,
    };
}
