const mongoose = require('mongoose');
const Student = require('../models/Student');
require('dotenv').config();

const sampleStudents = [
  {
    name: "David Rodriguez",
    title: "FIDE Master",
    rating: "2380",
    peakRating: "2400",
    program: "Elite Training Program",
    achievements: [
      "Gained 400 rating points in 18 months",
      "FIDE Master title achieved",
      "Regional Championship Winner"
    ],
    joinDate: "January 2023",
    testimonial: "The Aspire Chess Academy transformed my understanding of the game. The personalized coaching and cutting-edge analysis tools helped me achieve my FM title in just 18 months.",
    image: "👨‍🎓",
    bio: "David started as a club player and through dedicated training at Aspire, achieved his FIDE Master title. His rapid improvement is a testament to our structured approach.",
    isActive: true,
    featured: true,
    displayOrder: 1
  },
  {
    name: "Emma Thompson",
    title: "National Champion",
    rating: "2150",
    peakRating: "2180",
    program: "Tactical Mastery Program",
    achievements: [
      "Won National Championship",
      "State Champion 2023",
      "Improved 300 rating points"
    ],
    joinDate: "March 2022",
    testimonial: "The tactical training program here is unmatched. My pattern recognition improved dramatically, and I won my first national tournament within a year of joining.",
    image: "👩‍🎓",
    bio: "Emma's tactical prowess and tournament success make her one of our most accomplished students. She specializes in sharp, tactical positions.",
    isActive: true,
    featured: true,
    displayOrder: 2
  },
  {
    name: "Alex Kim",
    title: "Candidate Master",
    rating: "2050",
    peakRating: "2080",
    program: "Foundation to Elite Journey",
    achievements: [
      "0 to 2050 rating in 2 years",
      "Candidate Master title",
      "Youth Championship Finalist"
    ],
    joinDate: "September 2021",
    testimonial: "From a complete beginner to CM level - the structured curriculum and supportive environment at Aspire made this incredible journey possible.",
    image: "👨‍💼",
    bio: "Alex's journey from beginner to Candidate Master in just 2 years showcases the effectiveness of our comprehensive training methodology.",
    isActive: true,
    featured: true,
    displayOrder: 3
  },
  {
    name: "Maria Santos",
    title: "WIM",
    rating: "2280",
    peakRating: "2320",
    program: "Women's Excellence Program",
    achievements: [
      "Women's International Master",
      "Continental Championship Bronze",
      "Olympiad Team Member"
    ],
    joinDate: "June 2020",
    testimonial: "The psychological training component sets Aspire apart. Learning to manage time pressure and maintain focus under stress was game-changing for my tournament performance.",
    image: "👩‍💼",
    bio: "Maria represents the pinnacle of women's chess achievement at our academy. Her international success inspires our next generation of female players.",
    isActive: true,
    featured: false,
    displayOrder: 4
  },
  {
    name: "James Wilson",
    title: "Expert",
    rating: "1950",
    peakRating: "1980",
    program: "Adult Improvement Program",
    achievements: [
      "Expert rating achieved",
      "Club Champion 2023",
      "Improved 500 points"
    ],
    joinDate: "November 2022",
    testimonial: "As an adult learner, I thought significant improvement was impossible. Aspire proved me wrong with their adult-focused training methods.",
    image: "👨‍🏫",
    bio: "James proves that chess improvement has no age limit. His dedication and our adult-focused methodology led to remarkable progress.",
    isActive: true,
    featured: false,
    displayOrder: 5
  }
];

const seedStudents = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing students
    await Student.deleteMany({});
    console.log('Cleared existing students');

    // Insert sample students
    await Student.insertMany(sampleStudents);
    console.log('Sample students inserted successfully');

    console.log(`Inserted ${sampleStudents.length} students`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding students:', error);
    process.exit(1);
  }
};

seedStudents();