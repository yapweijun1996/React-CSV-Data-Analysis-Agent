import type { EnginePlaybook } from './contracts';

export const PLAYBOOKS: EnginePlaybook[] = [
    {
        id: 'greeting_minimal',
        intent: 'greeting',
        success_criteria: ['user_follow_up'],
        ui: {
            message_template:
                '{{greeting}}！I am ready to explore your CSV now. 快速開始選項：\n{{quick_choice_list}}\n(也可以直接輸入想看的指令～)',
            quick_action_rules: [
                {
                    source: 'tools',
                    filter: { tags_any: ['starter', 'safe', 'low_latency'], context: ['idle'] },
                    top_k: 5,
                },
            ],
        },
        governance: {
            max_tokens: 80,
            deny_tools_if: {
                latency_class: ['long'],
                risk: ['high'],
            },
        },
    },
    {
        id: 'remove_card_flow',
        intent: 'remove_card',
        success_criteria: ['card_removed'],
        ui: {
            message_template: 'Removing the card "{{cardTitle}}" from the dashboard now.',
        },
        governance: {
            deny_tools_if: {
                risk: ['high'],
            },
        },
    },
];

export const selectPlaybookForIntent = (intent?: string | null): EnginePlaybook | undefined => {
    if (!intent) return undefined;
    return PLAYBOOKS.find(playbook => playbook.intent === intent);
};
