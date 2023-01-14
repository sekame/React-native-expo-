import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Keyboard,
} from "react-native";
import { getStatusBarHeight } from "react-native-status-bar-height";
import { FontAwesome, FontAwesome5, AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";

const { width: INNER_WIDTH } = Dimensions.get("window");
const STATUS_BAR_HEIGHT =
  Platform.OS === "ios" ? getStatusBarHeight(true) : StatusBar.currentHeight;
const STORAGE_KEY = "@toDos";
const white = "#e7ecef";
const black = "#292f36";
const gray = "#939597";
const gripColor = "#6c757d";
const deleteBtn = "firebrick";
const doneColor = "#ced4da";

export default function App() {
  const scrollRef = useRef(null);

  const [keyboard, setKeyboard] = useState([false, 0]);
  const [loading, setLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(true);
  const [text, setText] = useState("");
  const [editText, setEditText] = useState("");
  const [toDos, setToDos] = useState([]);
  const [doneCount, setDoneCount] = useState({
    work: { done: 0, notDone: 0 },
    play: { done: 0, notDone: 0 },
  });

  const onWork = () => setIsWorking(true);
  const onPlay = () => setIsWorking(false);

  const onChangeText = (value) => {
    setText(value);
  };

  const onChangeEditText = (value) => {
    setEditText(value);
  };

  const changeDoneCount = (
    workDone = 0,
    workNotDone = 0,
    playDone = 0,
    playNotDone = 0
  ) => {
    setDoneCount((prev) => {
      console.log({
        work: {
          done: prev.work.done + workDone,
          notDone: prev.work.notDone + workNotDone,
        },
        play: {
          done: prev.play.done + playDone,
          notDone: prev.play.notDone + playNotDone,
        },
      });

      return {
        work: {
          done: prev.work.done + workDone,
          notDone: prev.work.notDone + workNotDone,
        },
        play: {
          done: prev.play.done + playDone,
          notDone: prev.play.notDone + playNotDone,
        },
      };
    });
  };

  const saveToDos = async (toSave) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error(error);
      Alert.alert(
        "오류가 발생하였습니다.\n잠시 후 다시 시도해주세요.",
        `(${error.message})`
      );
    }
  };

  const loadToDos = async () => {
    try {
      const strToDos = await AsyncStorage.getItem(STORAGE_KEY);
      const arrToDos = JSON.parse(strToDos);

      setDoneCount({
        work: { done: 0, notDone: 0 },
        play: { done: 0, notDone: 0 },
      });

      let workDone = 0;
      let workNotDone = 0;
      let playDone = 0;
      let playNotDone = 0;

      arrToDos.forEach((toDo) => {
        if (toDo.isWorking) {
          if (toDo.isDone) {
            workDone += 1;
          } else {
            workNotDone += 1;
          }
        } else {
          if (toDo.isDone) {
            playDone += 1;
          } else {
            playNotDone += 1;
          }
        }
      });

      changeDoneCount(workDone, workNotDone, playDone, playNotDone);
      setToDos(arrToDos);
      setLoading(false);
    } catch (error) {
      console.error(error);
      Alert.alert(
        "오류가 발생하였습니다.\n잠시 후 다시 시도해주세요.",
        `(${error.message})`
      );
    }
  };

  const addToDo = async () => {
    if (text === "") {
      return;
    }

    const newToDos = [...toDos];

    newToDos.splice(doneCount.play.notDone + doneCount.work.notDone, 0, {
      key: Date.now(),
      text,
      isWorking,
      isDone: false,
    });

    if (isWorking) {
      changeDoneCount(0, 1, 0, 0);
    } else {
      changeDoneCount(0, 0, 0, 1);
    }

    setToDos(newToDos);
    await saveToDos(newToDos);

    setText("");

    scrollRef.current.scrollToEnd();
  };

  const deleteToDo = async (index) => {
    const newToDos = [...toDos];

    let isDone = newToDos[index].isDone;

    newToDos.splice(index, 1);

    setToDos(newToDos);

    if (isWorking) {
      if (isDone) {
        changeDoneCount(-1, 0, 0, 0);
      } else {
        changeDoneCount(0, -1, 0, 0);
      }
    } else {
      if (isDone) {
        changeDoneCount(0, 0, -1, 0);
      } else {
        changeDoneCount(0, 0, 0, -1);
      }
    }

    await saveToDos(newToDos);
  };

  const checkToDo = async (index) => {
    const newToDos = [...toDos];

    if (!toDos[index].isDone) {
      const updateToDo = { ...toDos[index], isDone: true };
      newToDos.splice(index, 1);
      newToDos.push(updateToDo);

      if (isWorking) {
        changeDoneCount(1, -1, 0, 0);
      } else {
        changeDoneCount(0, 0, 1, -1);
      }
    } else {
      const updateToDo = { ...toDos[index], isDone: false };
      newToDos.splice(index, 1);
      newToDos.unshift(updateToDo);

      if (isWorking) {
        changeDoneCount(-1, 1, 0, 0);
      } else {
        changeDoneCount(0, 0, -1, 1);
      }
    }

    setToDos(newToDos);
    await saveToDos(newToDos);
  };

  const editToDo = async (index) => {
    if (editText.length === 0) {
      return;
    }
    const newToDos = [...toDos];

    const updateToDo = { ...toDos[index], text: editText };
    newToDos.splice(index, 1, updateToDo);

    setToDos(newToDos);
    await saveToDos(newToDos);
  };

  useEffect(() => {
    const keyboardShow = (e) => {
      setKeyboard([true, e.endCoordinates.height]);
    };
    const keyboardHide = (e) => {
      setKeyboard([false, e.endCoordinates.height]);
    };

    loadToDos();

    Keyboard.addListener("keyboardDidShow", keyboardShow);
    Keyboard.addListener("keyboardDidHide", keyboardHide);

    return () => {
      Keyboard.removeAllListeners("keyboardDidShow");
      Keyboard.removeAllListeners("keyboardDidHide");
    };
  }, []);

  const toDoItem = ({ item, drag, isActive, index }) => {
    const [editMode, setEditMode] = useState(false);

    return isWorking === item.isWorking ? (
      <ScaleDecorator>
        <View
          style={{
            ...styles.toDo,
            backgroundColor: item.isDone ? doneColor : black,
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            bounces={false}
          >
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => {
                checkToDo(index);
              }}
            >
              <AntDesign
                name="checkcircle"
                size={24}
                color={white}
                style={{
                  backgroundColor: item.isDone ? doneColor : white,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              />
            </TouchableOpacity>
            <View
              style={{
                ...styles.toDoTextSection,
                width: item.isDone ? INNER_WIDTH - 100 : INNER_WIDTH - 145,
                marginRight: item.isDone ? 20 : 0,
              }}
            >
              {editMode ? (
                <TextInput
                  style={styles.editInput}
                  value={editText}
                  onChangeText={onChangeEditText}
                  autoFocus
                  onSubmitEditing={() => {
                    editToDo(index);
                    setEditMode(false);
                  }}
                  returnKeyType="done"
                  onBlur={() => {
                    editToDo(index);
                    setEditMode(false);
                  }}
                />
              ) : item.isDone ? (
                <View>
                  <Text
                    style={{
                      ...styles.toDoText,
                      color: gray,
                      textDecorationLine: "line-through",
                    }}
                  >
                    {item.text}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setEditMode(true);
                    setEditText(item.text);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      ...styles.toDoText,
                      color: white,
                      height: isActive ? 19.5 : "auto",
                    }}
                  >
                    {item.text}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {!item.isDone && (
              <TouchableOpacity
                style={styles.grip}
                activeOpacity={0.4}
                onLongPress={drag}
                disabled={isActive}
              >
                <FontAwesome5 name="grip-lines" size={24} color={gripColor} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.toDoMenuSection}
              activeOpacity={0.8}
              onPress={() => {
                deleteToDo(index);
              }}
            >
              <FontAwesome name="trash-o" size={24} color={white} />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ScaleDecorator>
    ) : null;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View
        style={{
          ...styles.header,
        }}
      >
        <View style={styles.tab}>
          <TouchableOpacity onPress={onWork}>
            <Text
              style={{ ...styles.btnText, color: isWorking ? black : gray }}
            >
              WORK
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onPlay}>
            <Text
              style={{ ...styles.btnText, color: isWorking ? gray : black }}
            >
              PLAY
            </Text>
          </TouchableOpacity>
        </View>
        <View>
          <View
            style={{
              height: 20,
              backgroundColor: doneColor,
              borderRadius: 15,
              flexDirection: "row",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flex: isWorking ? doneCount.work.done : doneCount.play.done,
                backgroundColor: gripColor,
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            ></View>
            <View
              style={{
                flex: isWorking
                  ? doneCount.work.notDone
                  : doneCount.play.notDone,
              }}
            />
          </View>
        </View>
        <TextInput
          blurOnSubmit={false}
          value={text}
          onChangeText={onChangeText}
          onSubmitEditing={addToDo}
          returnKeyType="done"
          style={styles.input}
          placeholderTextColor={gray}
          placeholder={isWorking ? "Add To Work" : "Add To Play"}
        />
      </View>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={black} size="large" />
        </View>
      ) : (
        <View
          style={{
            ...styles.content,
            paddingBottom: keyboard[0] ? keyboard[1] : 10,
          }}
        >
          <DraggableFlatList
            ref={scrollRef}
            containerStyle={styles.list}
            data={toDos}
            onDragEnd={({ data }) => {
              setToDos(data);
              saveToDos(data);
            }}
            keyExtractor={(item) => item.key}
            renderItem={toDoItem}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    backgroundColor: "green",
    flex: 1,
    backgroundColor: white,
  },
  header: {
    paddingTop: STATUS_BAR_HEIGHT + 10,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  tab: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  btnText: {
    color: gray,
    fontSize: 44,
    fontWeight: "700",
  },
  input: {
    backgroundColor: black,
    color: white,
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 15,
    fontSize: 18,
    marginTop: 20,
  },
  content: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  toDo: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: black,
    borderRadius: 15,
    marginTop: 5,
    marginBottom: 5,
    overflow: "hidden",
  },
  checkbox: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  toDoTextSection: {
    justifyContent: "center",
    paddingVertical: 15,
    paddingLeft: 5,
  },
  toDoText: {
    color: white,
    fontSize: 16,
    justifyContent: "center",
  },
  editInput: {
    color: white,
    fontSize: 16,
  },
  grip: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  toDoMenuSection: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: deleteBtn,
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
    justifyContent: "center",
  },
});