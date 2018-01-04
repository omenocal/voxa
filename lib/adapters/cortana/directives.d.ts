import { HeroCard as HeroCardType, SuggestedActions as SuggestedActionsType } from "botbuilder";
import { directiveHandler } from "../../VoxaReply";
export declare function HeroCard(templatePath: string | HeroCardType): directiveHandler;
export declare function SuggestedActions(templatePath: string | SuggestedActionsType): directiveHandler;
