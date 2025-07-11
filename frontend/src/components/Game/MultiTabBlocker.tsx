// src/components/MultiTabBlocker.tsx
import { DocumentDuplicateIcon } from '@heroicons/react/24/solid';

export function MultiTabBlocker() {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center text-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-md">
                <DocumentDuplicateIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Outra aba do jogo já está aberta
                </h1>
                <p className="text-gray-600">
                    Para evitar problemas, você só pode ter uma aba do jogo aberta por vez.
                    Por favor, feche esta aba e continue na original.
                </p>
            </div>
        </div>
    );
}