
import { http, HttpResponse } from 'msw';

const handlers = [
    http.get('https://api.github.com/repos/Mirasii/BongBot-Ptero/releases/latest', () => {
        return HttpResponse.json({
            tag_name: 'v1.0.0'
        });
    }),
    http.get('https://api.github.com/repos/Mirasii/BongBot-Ptero/branches/main', () => {
        return HttpResponse.json({
            commit: {
                sha: 'abc123',
                commit: {
                    message: 'Test commit',
                    author: {
                        name: 'Test Author',
                        date: new Date().toISOString()
                    }
                },
                author: {
                    avatar_url: 'http://example.com/avatar.jpg'
                }
            }
        });
    }),
];

export { handlers };
