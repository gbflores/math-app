# Math Practice App

A simple math practice web application designed to help my daughter improve their math skills. The app provides interactive flashcards for addition, subtraction, multiplication, and division, tailored to specific rules for each operation.

## Features

- **Operation Selection:** Choose from addition, subtraction, multiplication, or division.
- **Dynamic Problem Generation:**
  - **Addition:** Numbers from 1 to 1000 (e.g., 357 + 58).
  - **Subtraction:** Numbers from 1 to 1000, ensuring non-negative results (e.g., 935 - 720).
  - **Multiplication:** Multiplication table problems from 1x1 to 10x10.
  - **Division:** Numbers up to 50, ensuring integer results (e.g., 30 ÷ 3 or 25 ÷ 5).
- **Flashcards:** Each problem is presented as a flashcard with four answer options (one correct, three random).
- **Interactive Feedback:** Correct answers turn green, incorrect ones turn red.
- **Score Tracking:** Displays total correct and incorrect answers.
- **Light/Dark Mode:** Toggle between light and dark themes for a better user experience.
- **Responsive Design:** Fully functional on desktops, tablets, and mobile devices.

## Technologies Used

- **Next.js (v15)** with App Router
- **React** (hooks for state management)
- **TypeScript** for type safety and better developer experience
- **Tailwind CSS** for styling
- **Vercel** for hosting and deployment

## How to Run the App

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/gbflores/math-practice-app.git
   ```

2. **Navigate to the project directory**:

   ```bash
   cd math-practice-app
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

### Running the Development Server

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

### Building for Production

To create an optimized production build:

```bash
npm run build
```

Then, run the production server:

```bash
npm run start
```

Your app should now be available at [http://localhost:3000](http://localhost:3000).

## How to Use

1. **Select an Operation:** Choose from addition, subtraction, multiplication, or division on the home page.
2. **Answer Flashcards:** Solve the displayed problems by selecting one of the four options.
3. **View Feedback:** After selecting an answer, see if it’s correct (green) or incorrect (red).
4. **Track Your Progress:** Monitor the score for correct and incorrect answers at the bottom of the flashcard.
5. **Switch Modes:** Use the toggle button in the top-right corner to switch between light and dark modes.
6. **Go Back:** Use the "Voltar" button to return to the home page and select another operation.

## About

This application was created to provide a fun and interactive way to practice basic math skills. Perfect for both kids and adults looking to improve their arithmetic abilities.

---
