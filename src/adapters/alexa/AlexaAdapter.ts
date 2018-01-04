import * as debug from "debug";
import * as _ from "lodash";
import * as rp from "request-promise";
import * as url from "url";

import { OutputSpeech, Response, ResponseBody, Template } from "alexa-sdk";

import { toSSML } from "../../ssml";
import { ITransition } from "../../StateMachine";
import { VoxaApp } from "../../VoxaApp";
import { IVoxaEvent } from "../../VoxaEvent";
import { VoxaReply } from "../../VoxaReply";
import { VoxaAdapter } from "../VoxaAdapter";
import { AlexaEvent } from "./AlexaEvent";
import { AlexaReply } from "./AlexaReply";

const log: debug.IDebugger = debug("voxa");

const AlexaRequests = [
  "AudioPlayer.PlaybackStarted",
  "AudioPlayer.PlaybackFinished",
  "AudioPlayer.PlaybackNearlyFinished",
  "AudioPlayer.PlaybackStopped",
  "AudioPlayer.PlaybackFailed",
  "System.ExceptionEncountered",
  "PlaybackController.NextCommandIssued",
  "PlaybackController.PauseCommandIssued",
  "PlaybackController.PlayCommandIssued",
  "PlaybackController.PreviousCommandIssued",
  "AlexaSkillEvent.SkillAccountLinked",
  "AlexaSkillEvent.SkillEnabled",
  "AlexaSkillEvent.SkillDisabled",
  "AlexaSkillEvent.SkillPermissionAccepted",
  "AlexaSkillEvent.SkillPermissionChanged",
  "AlexaHouseholdListEvent.ItemsCreated",
  "AlexaHouseholdListEvent.ItemsUpdated",
  "AlexaHouseholdListEvent.ItemsDeleted",
  "Display.ElementSelected",
];

export class AlexaAdapter extends VoxaAdapter<AlexaReply> {
  /*
   * Sends a partial reply after every state change
   */
  public static partialReply(event: AlexaEvent, reply: AlexaReply) {
    if (!_.get(event, "context.System.apiEndpoint")) {
      return Promise.resolve(null);
    }

    if (reply.isYielding()) {
      return Promise.resolve(null);
    }

    const endpoint = url.resolve(event.context.System.apiEndpoint, "/v1/directives");
    const authorizationToken = event.context.System.apiAccessToken;
    const requestId = event.request.requestId;
    const speech = toSSML(reply.response.statements.join("\n"));

    if (!speech) {
      return Promise.resolve(null);
    }

    const body = {
      directive: {
        speech,
        type: "VoicePlayer.Speak",
      },
      header: {
        requestId,
      },
    };

    log("apiRequest");
    log(body);

    return AlexaAdapter.apiRequest(endpoint, body, authorizationToken)
      .then(() => {
        reply.clear();
      });
  }

  public static apiRequest(endpoint: string, body: any, authorizationToken: string): any {
    const requestOptions = {
      auth: {
        bearer: authorizationToken,
      },
      body,
      json: true,
      method: "POST",
      uri: endpoint,
    };

    return rp(requestOptions);
  }

  constructor(voxaApp: VoxaApp) {
    super(voxaApp);
    this.app.onAfterStateChanged((voxaEvent: AlexaEvent, reply: AlexaReply, transition: ITransition) => AlexaAdapter.partialReply(voxaEvent, reply));
    _.forEach(AlexaRequests, (requestType) => voxaApp.registerRequestHandler(requestType));
  }

  public async execute(rawEvent: any, context: any): Promise<ResponseBody> {
    const alexaEvent = new AlexaEvent(rawEvent, context);
    const reply = await this.app.execute(alexaEvent, AlexaReply) as AlexaReply;
    return reply.toJSON();
  }
}
