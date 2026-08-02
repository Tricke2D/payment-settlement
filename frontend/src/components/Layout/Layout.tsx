import React, { ReactNode } from 'react';

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="bg-gray-100 dark:bg-dark-bg min-h-screen transition-colors">
            <div className="max-w-7xl mx-auto px-4 py-6">
                {children}
            </div>
        </div>
    );
};

export default Layout;