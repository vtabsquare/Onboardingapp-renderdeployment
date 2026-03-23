import React, { createContext, useContext, useState } from 'react';

const EditableContext = createContext();

export const EditableProvider = ({ children }) => {
    const [isEditable, setIsEditable] = useState(false);
    const [customLogo, setCustomLogo] = useState(null);
    const [customSign, setCustomSign] = useState(null);

    const toggleEditable = () => setIsEditable(!isEditable);

    return (
        <EditableContext.Provider value={{
            isEditable,
            toggleEditable,
            customLogo,
            setCustomLogo,
            customSign,
            setCustomSign
        }}>
            {children}
        </EditableContext.Provider>
    );
};

export const useEditable = () => {
    const context = useContext(EditableContext);
    if (!context) {
        throw new Error('useEditable must be used within an EditableProvider');
    }
    return context;
};
