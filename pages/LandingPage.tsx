import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
            {/* Navbar not needed for landing, maybe just a logo */}
            <header className="fixed w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <i className="fas fa-brain text-white text-sm"></i>
                            </div>
                            <span className="text-xl font-bold tracking-tight">Cognify</span>
                        </div>
                        <Link
                            to="/dashboard"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                            Launch App
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-grow">
                <div className="relative isolate px-6 lg:px-8 min-h-screen flex items-center justify-center pt-16">
                    <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
                        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}></div>
                    </div>

                    <div className="mx-auto max-w-2xl text-center">
                        <div className="hidden sm:mb-8 sm:flex sm:justify-center">
                            <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-slate-400 ring-1 ring-white/10 hover:ring-white/20">
                                Announcing our new AI features. <a href="#" className="font-semibold text-indigo-400"><span className="absolute inset-0" aria-hidden="true"></span>Read more <span aria-hidden="true">&rarr;</span></a>
                            </div>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                            AI Brain for Your Brain
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-slate-400">
                            Supercharge your learning with AI-powered roadmaps, interactive environments, and personalized guidance. Master complex topics faster than ever.
                        </p>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Link
                                to="/dashboard"
                                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            >
                                Get Started
                            </Link>
                            <a href="#" className="text-sm font-semibold leading-6 text-white">Learn more <span aria-hidden="true">→</span></a>
                        </div>
                    </div>

                    <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]" aria-hidden="true">
                        <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}></div>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="bg-slate-900 py-24 sm:py-32 border-t border-slate-800">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl lg:text-center">
                            <h2 className="text-base font-semibold leading-7 text-indigo-400">Learn Faster</h2>
                            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Everything you need to master any subject</p>
                            <p className="mt-6 text-lg leading-8 text-slate-400">
                                Cognify combines structured learning paths with interactive tools to help you retain knowledge better.
                            </p>
                        </div>
                        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
                            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
                                {[
                                    {
                                        name: 'Interactive Roadmaps',
                                        description: 'Visualize your learning journey with dynamic roadmaps that track your progress and guide you step-by-step.',
                                        icon: 'fa-map-signs'
                                    },
                                    {
                                        name: 'AI Playground',
                                        description: 'Experiment in a safe, sandboxed environment powered by advanced AI models to test your knowledge in real-time.',
                                        icon: 'fa-flask'
                                    },
                                    {
                                        name: 'Smart Chatbot',
                                        description: 'Get instant answers to your questions from a context-aware AI tutor that understands your learning path.',
                                        icon: 'fa-robot'
                                    },
                                    {
                                        name: 'Competitive Leaderboards',
                                        description: 'Stay motivated by competing with peers and tracking your rank as you master new skills.',
                                        icon: 'fa-trophy'
                                    },
                                ].map((feature) => (
                                    <div key={feature.name} className="relative pl-16">
                                        <dt className="text-base font-semibold leading-7 text-white">
                                            <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                                                <i className={`fas ${feature.icon} text-white`}></i>
                                            </div>
                                            {feature.name}
                                        </dt>
                                        <dd className="mt-2 text-base leading-7 text-slate-400">{feature.description}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-slate-900 border-t border-slate-800 py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex justify-center text-slate-500">
                    <p>&copy; 2024 Cognify Inc. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
