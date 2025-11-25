# 🚀 MISIÓN FUTURO

**MISIÓN FUTURO** is a mini web videogame integrated into WordPress.  
It transforms a traditional questionnaire into an interactive experience where the user progresses through a small 2D runner, dodges obstacles, and answers questions along the way.

The goal is to make data collection more engaging and dynamic, delivering a smooth, retro-styled experience.

---

## 🎮 How It Works

- The player moves through a retro-style environment.  
- Each door in the path corresponds to a questionnaire question.  
- The user selects answers while dodging obstacles.  
- At the end, a form appears requesting name, email, and phone.  
- The game calculates the recommended academies based on the answers.  
- A final small “assignment ceremony” displays the results.  

Everything happens on a single screen, with no reloads, and with support for both desktop and mobile controls.

---

## 📊 Data Logging

When the user completes **MISIÓN FUTURO** and submits the final form, the system automatically saves all information into a CSV file.

**Each entry includes:**
- Name  
- Phone  
- Email  
- Academy 1 (main result)  
- Academy 2 (if applicable)  
- Submission date  

The file updates automatically with each completed run.

---

## ⚙️ WordPress Integration

**MISIÓN FUTURO** works as a standalone WordPress plugin:

1. The plugin folder is compressed into a `.zip`.  
2. Install it via *Plugins → Add New → Upload Plugin*.  
3. Activate it.  
4. Insert it on any page via shortcode.  

No additional configuration required.

---

## 🛠️ Technologies Used

- **JavaScript (Canvas 2D)**  
  Lightweight game engine, animations, simple physics, and character control.

- **PHP**  
  Handles the final form submission and writes data to the CSV.

- **AJAX**  
  Enables communication between the game and WordPress without page reloads.

- **Responsive CSS**  
  Layout adjustments for desktop, mobile, and horizontal orientation.

- **WordPress**  
  Integration environment and data storage point.

---

## 🎯 Project Purpose

**MISIÓN FUTURO** was created to improve user experience and make a typically monotonous process more enjoyable.  
The mix of retro-style gameplay, light narrative, and personalized recommendations provides a memorable interaction while maintaining a clean and efficient data collection flow.
