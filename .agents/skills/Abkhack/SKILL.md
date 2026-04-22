```markdown
# Abkhack Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions found in the **Abkhack** Python repository. You'll learn how to structure files, write imports and exports, and follow the project's unique coding and commit styles. This guide also covers how to identify and write tests, and suggests commands for common workflows.

## Coding Conventions

### File Naming
- **Style:** camelCase
- **Example:** `dataProcessor.py`, `userManager.py`

### Import Style
- **Style:** Use aliases for imports.
- **Example:**
  ```python
  import numpy as np
  import pandas as pd
  ```

### Export Style
- **Style:** Mixed (can use both explicit and implicit exports)
- **Example:**
  ```python
  # Implicit export
  def processData(data):
      ...

  # Explicit export
  __all__ = ['processData', 'analyzeResults']
  ```

### Commit Patterns
- **Type:** Freeform (no strict prefixing)
- **Prefixes:** None required, but allowed
- **Average Length:** ~48 characters
- **Example:**
  ```
  Add new data processing function for user input
  ```

## Workflows

### Adding a New Feature
**Trigger:** When you want to introduce new functionality.
**Command:** `/add-feature`

1. Create a new Python file using camelCase naming.
2. Write your code, using alias imports where needed.
3. Export functions or classes as needed (mixed style).
4. Write a corresponding test file with `.test.` in the filename.
5. Commit your changes with a clear, concise message.

### Writing a Test
**Trigger:** When you need to verify new or existing code.
**Command:** `/write-test`

1. Create a test file named with `.test.` (e.g., `dataProcessor.test.py`).
2. Write test functions for each major function or class.
3. Use assertions to verify expected outcomes.
4. Run tests using your preferred Python test runner.

### Refactoring Code
**Trigger:** When improving code readability or structure.
**Command:** `/refactor`

1. Rename files to camelCase if needed.
2. Update imports to use aliases consistently.
3. Adjust exports to match the mixed style.
4. Update or add tests as necessary.
5. Commit with a descriptive message.

## Testing Patterns

- **Framework:** Unknown (use your preferred Python test runner)
- **File Pattern:** Test files are named with `.test.` in the filename (e.g., `moduleName.test.py`).
- **Example:**
  ```python
  # dataProcessor.test.py
  import unittest
  from dataProcessor import processData

  class TestProcessData(unittest.TestCase):
      def test_valid_input(self):
          result = processData([1, 2, 3])
          self.assertEqual(result, [2, 3, 4])
  ```

## Commands
| Command        | Purpose                                   |
|----------------|-------------------------------------------|
| /add-feature   | Start the process of adding a new feature |
| /write-test    | Begin writing tests for code              |
| /refactor      | Refactor code to match conventions        |
```
