import { api } from "./api.js";

export function getPersons(groupId) {
  return api(groupId ? "/persons?groupId=" + encodeURIComponent(groupId) : "/persons");
}

export function getPerson(id) {
  return api("/persons/" + encodeURIComponent(id));
}

export function createPerson(person, groupId) {
  return api(personUrl(groupId), {
    method: "POST",
    body: JSON.stringify(person)
  });
}

export function updatePerson(person, groupId) {
  return api(personUrl(groupId), {
    method: "PUT",
    body: JSON.stringify(person)
  });
}

export function deletePerson(id) {
  return api("/persons/" + encodeURIComponent(id), {
    method: "DELETE"
  });
}

function personUrl(groupId) {
  return groupId ? "/persons?groupId=" + encodeURIComponent(groupId) : "/persons";
}
